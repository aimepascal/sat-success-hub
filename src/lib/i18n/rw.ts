import type { MessageKey } from "./en";

// Kinyarwanda strings. First draft, not yet checked by a native speaker:
// review before showing to students.
export const rw: Record<MessageKey, string> = {
  "nav.today": "Uyu munsi",
  "nav.practice": "Imyitozo",
  "nav.reviewDesk": "Isuzuma ry'ibibazo",
  "language.label": "Ururimi",

  "common.loading": "Birimo gufunguka…",
  "common.retry": "Ongera ugerageze",

  "today.greeting": "Muraho, {name}",
  "today.subtitle": "Iminota 15 yawe y'uyu munsi",
  "today.progress": "{done} kuri {total} byarangiye",
  "today.streak": "Iminsi {days} ikurikiranye",
  "today.start": "Tangira imyitozo",
  "today.continue": "Komeza",
  "today.done": "Gahunda y'uyu munsi yarangiye. Uzagaruke ejo.",
  "today.reviews": "Subiramo amakosa {count}",
  "today.reviewsHint": "Bigomba gukorwa uyu munsi",
  "today.weak": "Ibibazo {count} ku bumenyi ukeneye gukomeza",
  "today.weakHint": "Byatoranyijwe hashingiwe ku bisubizo byawe",
  "today.stretch": "Ikibazo gikomeye",
  "today.stretchHint": "Kimwe gikomeye cyo gusoza",
  "today.empty": "Nta bibazo byemejwe birahari. Mwarimu wawe arimo kubitegura.",
  "today.loadFailed": "Gahunda y'uyu munsi ntiyabashije gufunguka. Reba interineti yawe.",

  "join.title": "Injira mu ishuri ryawe",
  "join.hint": "Andika kode mwarimu wawe yaguhaye.",
  "join.placeholder": "Kode yo kwinjira",
  "join.button": "Injira",
  "join.success": "Winjiye muri {name}.",
  "join.notFound": "Iyo kode ntiyabonetse. Yisuzume wongere ugerageze.",
  "join.member": "Ishuri: {name}",

  "mastery.title": "Ubumenyi kuri buri somo",
  "mastery.early": "ikigereranyo cy'ibanze",
  "mastery.none": "Subiza ibibazo bike kugira ngo ubone aho ugeze.",

  "practice.progress": "{current} kuri {total}",
  "practice.check": "Reba igisubizo",
  "practice.correct": "Ni byo",
  "practice.incorrect": "Si byo",
  "practice.explanation": "Ibisobanuro byasuzumwe",
  "practice.approved": "Byemejwe",
  "practice.slip": "Wahisemo {choice}. Ikosa rikunze kubaho: {label}",
  "practice.gotIt": "Ndabyumvise",
  "practice.explainDifferently": "Bisobanure ukundi",
  "practice.aiHelp": "Ubufasha bwa AI",
  "practice.aiNote":
    "Byanditswe na AI. Ishobora kwibeshya. Ibisobanuro byasuzumwe biri hejuru ni byo wakwizera.",
  "practice.aiLimited":
    "Wakoresheje ubufasha bwa AI bw'uyu munsi. Ibisobanuro byasuzumwe biri hejuru biracyakoreshwa.",
  "practice.aiUnavailable":
    "Ubufasha bwa AI ntibuboneka ubu. Ibisobanuro byasuzumwe biri hejuru biracyakoreshwa.",
  "practice.aiLoading": "Ndatekereza…",
  "practice.saveFailed": "Igisubizo cyawe nticyabitswe. Reba interineti yawe wongere ugerageze.",
  "practice.finishedTitle": "Gahunda irarangiye",
  "practice.finishedBody": "{correct} kuri {total} ni byo muri iki cyiciro.",
  "practice.backToToday": "Subira kuri Uyu munsi",
  "practice.nothing": "Nta myitozo ihari ubu.",

  "difficulty.easy": "Cyoroshye",
  "difficulty.medium": "Kiringaniye",
  "difficulty.hard": "Gikomeye",
};
