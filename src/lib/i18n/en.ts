// English strings. This is the source dictionary: every other language must
// provide the same keys. Values may contain {placeholders}.
export const en = {
  "nav.today": "Today",
  "nav.practice": "Practice",
  "nav.reviewDesk": "Review desk",
  "language.label": "Language",

  "common.loading": "Loading…",
  "common.retry": "Try again",

  "today.greeting": "Hello, {name}",
  "today.subtitle": "Your 15 minutes for today",
  "today.progress": "{done} of {total} done",
  "today.streak": "{days} day streak",
  "today.start": "Start practice",
  "today.continue": "Continue",
  "today.done": "Today's plan is done. Come back tomorrow.",
  "today.reviews": "Retry {count} mistakes",
  "today.reviewsHint": "Due today",
  "today.weak": "{count} questions on your weakest skills",
  "today.weakHint": "Chosen from your answers so far",
  "today.stretch": "Stretch question",
  "today.stretchHint": "1 harder one to finish",
  "today.empty": "No approved questions yet. Your teacher is preparing them.",
  "today.loadFailed": "Today's plan could not be loaded. Check your connection.",

  "join.title": "Join your class",
  "join.hint": "Enter the join code your teacher gave you.",
  "join.placeholder": "Join code",
  "join.button": "Join",
  "join.success": "You joined {name}.",
  "join.notFound": "That code was not found. Check it and try again.",
  "join.member": "Class: {name}",

  "mastery.title": "Mastery by skill",
  "mastery.early": "early estimate",
  "mastery.none": "Answer a few questions to see your mastery.",

  "practice.progress": "{current} of {total}",
  "practice.check": "Check answer",
  "practice.correct": "Correct",
  "practice.incorrect": "Not quite",
  "practice.explanation": "Reviewed explanation",
  "practice.approved": "Approved",
  "practice.slip": "You chose {choice}. A common slip: {label}",
  "practice.gotIt": "Got it",
  "practice.explainDifferently": "Explain differently",
  "practice.aiHelp": "AI help",
  "practice.aiNote":
    "Written by AI. It can be wrong. The reviewed explanation above is the one to trust.",
  "practice.aiLimited":
    "You have used today's AI help. The reviewed explanation above still applies.",
  "practice.aiUnavailable":
    "AI help is not available right now. The reviewed explanation above still applies.",
  "practice.aiLoading": "Thinking…",
  "practice.saveFailed": "Your answer was not saved. Check your connection and try again.",
  "practice.finishedTitle": "Plan complete",
  "practice.finishedBody": "{correct} of {total} correct in this session.",
  "practice.backToToday": "Back to Today",
  "practice.nothing": "Nothing to practise right now.",

  "difficulty.easy": "Easy",
  "difficulty.medium": "Medium",
  "difficulty.hard": "Hard",
} as const;

export type MessageKey = keyof typeof en;
