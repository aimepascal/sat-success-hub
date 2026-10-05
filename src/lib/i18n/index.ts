import { useSyncExternalStore } from "react";
import { en, type MessageKey } from "./en";
import { rw } from "./rw";

// To add a language (French is next): add a dictionary file with the same
// keys as en.ts, then list it here.
const dictionaries = { en, rw } satisfies Record<string, Record<MessageKey, string>>;

export type Language = keyof typeof dictionaries;
export const LANGUAGES: { code: Language; label: string }[] = [
  { code: "en", label: "English" },
  { code: "rw", label: "Kinyarwanda" },
];

const STORAGE_KEY = "imboni.language";
const listeners = new Set<() => void>();
let current: Language = readStored();

function readStored(): Language {
  if (typeof window === "undefined") return "en";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored && stored in dictionaries ? (stored as Language) : "en";
  } catch {
    return "en";
  }
}

export function getLanguage(): Language {
  return current;
}

export function setLanguage(language: Language) {
  current = language;
  try {
    window.localStorage.setItem(STORAGE_KEY, language);
  } catch {
    // Private mode or blocked storage: the choice just lasts for this visit.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function translate(
  language: Language,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const template: string = dictionaries[language][key] ?? en[key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function useI18n() {
  // The server always renders English; the stored choice is applied on hydration.
  const language = useSyncExternalStore(subscribe, getLanguage, () => "en" as Language);
  const t = (key: MessageKey, vars?: Record<string, string | number>) =>
    translate(language, key, vars);
  return { language, t };
}

/** Picks the Kinyarwanda text when that is the chosen language and it exists. */
export function localized(language: Language, english: string, kinyarwanda: string | null): string {
  return language === "rw" && kinyarwanda ? kinyarwanda : english;
}
