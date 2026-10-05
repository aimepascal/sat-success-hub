// Learning-engine rules from the Imboni build brief: mastery per skill, the
// spaced review queue, the daily plan, teacher alerts and improvement gain.
//
// Everything here is a pure function with no Supabase or browser access, so
// the same rules can run on the phone (offline packs), in server functions
// and in the nightly rollup. Mastery is a share from 0 to 1 throughout; use
// toPercent() for display.

export type Difficulty = "easy" | "medium" | "hard";

export type EngineConfig = {
  /** Attempts on a skill before mastery is shown as a percentage and the baseline is stored. */
  baselineAttempts: number;
  /** How far one attempt moves mastery once the baseline is set. */
  learningRate: Record<Difficulty, number>;
  /** Delay in days for review boxes 1, 2, 3, ... A correct review in the last box retires the item. */
  reviewDelaysDays: number[];
  plan: { size: number; maxReviews: number; stretch: number };
  alerts: {
    inactiveDays: number;
    stuckMissStreak: number;
    stuckMastery: number;
    behindPlanShare: number;
    behindMasteryDrop: number;
  };
};

// Starting values from the brief. Alert thresholds are meant to be overridden per cohort.
export const ENGINE_DEFAULTS: EngineConfig = {
  baselineAttempts: 8,
  learningRate: { easy: 0.16, medium: 0.2, hard: 0.24 },
  reviewDelaysDays: [1, 3, 7, 14],
  plan: { size: 10, maxReviews: 4, stretch: 1 },
  alerts: {
    inactiveDays: 3,
    stuckMissStreak: 3,
    stuckMastery: 0.5,
    behindPlanShare: 0.6,
    behindMasteryDrop: 0.1,
  },
};

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Mastery
// ---------------------------------------------------------------------------

export type SkillMastery = {
  mastery: number;
  attempts: number;
  /** Mastery after the first `baselineAttempts` attempts. Stored once, never updated. */
  baselineMastery: number | null;
};

export const NEW_SKILL_MASTERY: SkillMastery = { mastery: 0, attempts: 0, baselineMastery: null };

export function applyAttempt(
  state: SkillMastery,
  attempt: { correct: boolean; difficulty: Difficulty },
  config: EngineConfig = ENGINE_DEFAULTS,
): SkillMastery {
  const score = attempt.correct ? 1 : 0;
  const attempts = state.attempts + 1;

  // Up to the baseline, mastery is the simple share correct (a running mean).
  if (state.attempts < config.baselineAttempts) {
    const mastery = (state.mastery * state.attempts + score) / attempts;
    const baselineMastery = attempts === config.baselineAttempts ? mastery : state.baselineMastery;
    return { mastery, attempts, baselineMastery };
  }

  const rate = config.learningRate[attempt.difficulty];
  return {
    mastery: state.mastery + rate * (score - state.mastery),
    attempts,
    baselineMastery: state.baselineMastery,
  };
}

/** A percentage is only shown once there are enough attempts to trust it. */
export function hasReliableMastery(
  state: Pick<SkillMastery, "attempts">,
  config: EngineConfig = ENGINE_DEFAULTS,
): boolean {
  return state.attempts >= config.baselineAttempts;
}

export function toPercent(mastery: number): number {
  return Math.round(mastery * 100);
}

// ---------------------------------------------------------------------------
// Review queue (Leitner boxes)
// ---------------------------------------------------------------------------

export type ReviewItem = { box: number; dueAt: string };

/**
 * Returns the question's next place in the review queue, or null when it is
 * not (or no longer) queued. A miss always goes to box 1. A correct answer
 * only moves a question that is already queued.
 */
export function applyReview(
  current: ReviewItem | null,
  correct: boolean,
  now: Date,
  config: EngineConfig = ENGINE_DEFAULTS,
): ReviewItem | null {
  const delays = config.reviewDelaysDays;
  const dueIn = (box: number) => new Date(now.getTime() + delays[box - 1] * DAY_MS).toISOString();

  if (!correct) return { box: 1, dueAt: dueIn(1) };
  if (!current) return null;

  const nextBox = current.box + 1;
  if (nextBox > delays.length) return null;
  return { box: nextBox, dueAt: dueIn(nextBox) };
}

// ---------------------------------------------------------------------------
// Daily plan
// ---------------------------------------------------------------------------

export type PlanItem = { questionId: string; kind: "review" | "weak" | "stretch" };

export type PlanInput = {
  /** The student's review queue. Only items due at or before `now` are used. */
  reviews: { questionId: string; dueAt: string }[];
  /** Every skill in scope. `examWeight` is the relative weight of the skill's domain on the exam. */
  skills: { skillId: string; mastery: number; attempts: number; examWeight: number }[];
  /** Approved questions the student may be given, already filtered by the caller. */
  candidates: { questionId: string; skillId: string; difficulty: Difficulty }[];
  now: Date;
};

export function buildDailyPlan(
  input: PlanInput,
  config: EngineConfig = ENGINE_DEFAULTS,
): PlanItem[] {
  const { size, maxReviews, stretch } = config.plan;
  const used = new Set<string>();
  const take = (questionId: string, kind: PlanItem["kind"]): PlanItem => {
    used.add(questionId);
    return { questionId, kind };
  };

  // 1. Due reviews, longest overdue first.
  const nowIso = input.now.toISOString();
  const reviews = input.reviews
    .filter((r) => r.dueAt <= nowIso)
    .sort((a, b) => (a.dueAt < b.dueAt ? -1 : 1))
    .slice(0, maxReviews)
    .map((r) => take(r.questionId, "review"));

  // 2. One harder question to finish on, from the student's strongest skill
  //    that has one. Reserved now so the weak-skill picks don't use it up.
  const byStrength = [...input.skills].sort((a, b) => b.mastery - a.mastery);
  const stretchItems: PlanItem[] = [];
  for (const skill of byStrength) {
    if (stretchItems.length >= stretch) break;
    const hard = input.candidates.find(
      (c) => c.skillId === skill.skillId && c.difficulty === "hard" && !used.has(c.questionId),
    );
    if (hard) stretchItems.push(take(hard.questionId, "stretch"));
  }

  // 3. Fill the rest from the weakest skills, weighted toward heavier exam
  //    domains. A skill with no attempts yet counts as half-known. Skills take
  //    turns so one weak skill doesn't fill the whole plan.
  const byNeed = [...input.skills].sort((a, b) => planNeed(b) - planNeed(a));
  const pools = byNeed.map((skill) =>
    input.candidates.filter(
      (c) => c.skillId === skill.skillId && c.difficulty !== "hard" && !used.has(c.questionId),
    ),
  );
  const weakSlots = size - reviews.length - stretchItems.length;
  const weak: PlanItem[] = [];
  while (weak.length < weakSlots && pools.some((pool) => pool.length > 0)) {
    for (const pool of pools) {
      if (weak.length >= weakSlots) break;
      const next = pool.shift();
      if (next) weak.push(take(next.questionId, "weak"));
    }
  }

  return [...reviews, ...weak, ...stretchItems];
}

function planNeed(skill: { mastery: number; attempts: number; examWeight: number }): number {
  const mastery = skill.attempts === 0 ? 0.5 : skill.mastery;
  return (1 - mastery) * skill.examWeight;
}

// ---------------------------------------------------------------------------
// Teacher alerts
// ---------------------------------------------------------------------------

export type AlertKind = "inactive" | "stuck" | "behind";

export type Alert = { kind: AlertKind; skillId: string | null; detail: string };

export type AlertInput = {
  /** Last attempt, or the day the student joined if they have never practised. */
  lastActiveAt: string;
  skills: {
    skillId: string;
    name: string;
    mastery: number;
    attempts: number;
    /** Misses in a row on this skill, counting back from the latest attempt. */
    missStreak: number;
    /** Mastery at the start of the comparison window (14 days ago), if it was recorded. */
    masteryBefore: number | null;
  }[];
  /** Share of this week's plan completed, 0 to 1. Null when there is no plan yet. */
  weeklyPlanShare: number | null;
  now: Date;
};

export function evaluateAlerts(
  input: AlertInput,
  thresholds: EngineConfig["alerts"] = ENGINE_DEFAULTS.alerts,
  config: EngineConfig = ENGINE_DEFAULTS,
): Alert[] {
  const alerts: Alert[] = [];

  const idleDays = Math.floor(
    (input.now.getTime() - new Date(input.lastActiveAt).getTime()) / DAY_MS,
  );
  if (idleDays >= thresholds.inactiveDays) {
    alerts.push({ kind: "inactive", skillId: null, detail: `Inactive ${idleDays} days` });
  }

  for (const skill of input.skills) {
    if (skill.missStreak >= thresholds.stuckMissStreak) {
      alerts.push({
        kind: "stuck",
        skillId: skill.skillId,
        detail: `${skill.name}: ${skill.missStreak} misses in a row`,
      });
    } else if (hasReliableMastery(skill, config) && skill.mastery < thresholds.stuckMastery) {
      alerts.push({
        kind: "stuck",
        skillId: skill.skillId,
        detail: `${skill.name}: mastery ${toPercent(skill.mastery)}% after ${skill.attempts} attempts`,
      });
    }
  }

  if (input.weeklyPlanShare !== null && input.weeklyPlanShare < thresholds.behindPlanShare) {
    alerts.push({
      kind: "behind",
      skillId: null,
      detail: `Weekly plan ${toPercent(input.weeklyPlanShare)}% done`,
    });
  }
  for (const skill of input.skills) {
    if (skill.masteryBefore === null) continue;
    const drop = skill.masteryBefore - skill.mastery;
    if (drop >= thresholds.behindMasteryDrop) {
      alerts.push({
        kind: "behind",
        skillId: skill.skillId,
        detail: `${skill.name}: mastery down ${toPercent(drop)} points`,
      });
    }
  }

  return alerts;
}

// ---------------------------------------------------------------------------
// Improvement
// ---------------------------------------------------------------------------

/**
 * Gain against the stored baseline. The normalised gain is the share of the
 * available headroom that was gained, which makes 80 to 90 comparable with
 * 40 to 50. It is null when the baseline was already 100%.
 */
export function masteryGain(
  baseline: number,
  latest: number,
): { gain: number; normalisedGain: number | null } {
  const gain = latest - baseline;
  return { gain, normalisedGain: baseline >= 1 ? null : gain / (1 - baseline) };
}
