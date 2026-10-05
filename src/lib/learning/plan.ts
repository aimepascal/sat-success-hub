// Loads or builds the signed-in student's plan for today. The plan is built
// on the phone from engine.ts and saved once per day, so the same ten
// questions come back if the student leaves and returns.

import { buildDailyPlan, ENGINE_DEFAULTS } from "./engine";
import { learningDb, type DailyPlan } from "./db";

const DAY_MS = 24 * 60 * 60 * 1000;
// Questions answered this recently are left out of a new plan, unless they are due for review.
const RECENT_DAYS = 7;

/** The student's local calendar date as YYYY-MM-DD. */
export function localDate(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function check<T>(result: { data: T | null; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  if (result.data === null) throw new Error("No data returned");
  return result.data;
}

export async function loadOrBuildTodayPlan(userId: string): Promise<DailyPlan> {
  const now = new Date();
  const planDate = localDate(now);

  const existing = await learningDb
    .from("daily_plans")
    .select("*")
    .eq("user_id", userId)
    .eq("plan_date", planDate)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);
  if (existing.data) return existing.data;

  const [reviews, mastery, skills, domains, questions, recent] = await Promise.all([
    learningDb.from("review_queue").select("question_id, due_at").eq("user_id", userId),
    learningDb.from("skill_mastery").select("skill_id, mastery, attempts").eq("user_id", userId),
    learningDb.from("skills").select("id, domain_id"),
    learningDb.from("domains").select("id, exam_weight"),
    learningDb.from("questions").select("id, skill_id, difficulty").eq("status", "approved"),
    learningDb
      .from("attempts")
      .select("question_id")
      .eq("user_id", userId)
      .gte("created_at", new Date(now.getTime() - RECENT_DAYS * DAY_MS).toISOString()),
  ]);

  const weightByDomain = new Map(check(domains).map((d) => [d.id, Number(d.exam_weight)]));
  const masteryBySkill = new Map(check(mastery).map((m) => [m.skill_id, m]));
  const queued = check(reviews);
  const approved = check(questions);
  const approvedIds = new Set(approved.map((q) => q.id));

  // Fresh questions first; fall back to everything approved when the bank is
  // too small to fill a plan without repeats.
  const skip = new Set([
    ...check(recent).map((a) => a.question_id),
    ...queued.map((r) => r.question_id),
  ]);
  const fresh = approved.filter((q) => !skip.has(q.id));
  const pool = fresh.length >= ENGINE_DEFAULTS.plan.size ? fresh : approved;

  const items = buildDailyPlan({
    now,
    // A queued question that has since been retired or sent back is not shown.
    reviews: queued
      .filter((r) => approvedIds.has(r.question_id))
      .map((r) => ({ questionId: r.question_id, dueAt: new Date(r.due_at).toISOString() })),
    skills: check(skills).map((skill) => {
      const state = masteryBySkill.get(skill.id);
      return {
        skillId: skill.id,
        mastery: state ? Number(state.mastery) : 0,
        attempts: state?.attempts ?? 0,
        examWeight: weightByDomain.get(skill.domain_id) ?? 1,
      };
    }),
    candidates: pool.map((q) => ({
      questionId: q.id,
      skillId: q.skill_id,
      difficulty: q.difficulty,
    })),
  });

  // An empty bank gives an empty plan. Don't save it, so the student gets a
  // real plan as soon as questions are approved.
  if (items.length === 0) {
    return { user_id: userId, plan_date: planDate, items, completed_count: 0 };
  }

  // Two tabs opening at once: keep whichever plan was saved first.
  const saved = await learningDb
    .from("daily_plans")
    .upsert(
      { user_id: userId, plan_date: planDate, items, completed_count: 0 },
      { onConflict: "user_id,plan_date", ignoreDuplicates: true },
    );
  if (saved.error) throw new Error(saved.error.message);
  return check(
    await learningDb
      .from("daily_plans")
      .select("*")
      .eq("user_id", userId)
      .eq("plan_date", planDate)
      .single(),
  );
}

/** Days in a row with at least one attempt, counting back from today (or yesterday). */
export function streakFromAttempts(attemptTimes: string[], now: Date = new Date()): number {
  const days = new Set(attemptTimes.map((iso) => localDate(new Date(iso))));
  const cursor = new Date(now);
  // A streak is still alive if today's practice hasn't happened yet.
  if (!days.has(localDate(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localDate(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
