import type { Message } from "./types";

/**
 * Bemby only answers a chat once the person uses a booking word (or names one of the business's services),
 * so friends, family and random DMs are left alone. The owner can add their own words in Settings.
 */
export const DEFAULT_TRIGGER_WORDS = [
  "book", "booking", "booked", "appointment", "appt", "schedule", "reschedule", "cancel",
  "available", "availability", "opening", "openings", "slot",
  "price", "prices", "pricing", "how much", "cost", "rates", "deposit", "consultation", "consult",
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function triggerWordsFor(extra: string[] = [], serviceNames: string[] = []) {
  const all = [...DEFAULT_TRIGGER_WORDS, ...extra, ...serviceNames].map((w) => w.trim().toLowerCase()).filter((w) => w.length >= 2);
  return [...new Set(all)];
}

export function mentionsTrigger(text: string, words: string[]) {
  const t = text.toLowerCase();
  // Whole words only, so "book" matches "book me" / "booking" (listed) but not "facebook".
  return words.some((w) => new RegExp(`(^|[^a-z0-9])${escape(w)}($|[^a-z0-9])`, "i").test(t));
}

export const QUIET_NOTE = "Bemby is staying quiet: no booking words yet (like book, appointment or schedule).";
export const BACK_NOTE = "Bemby is back on this chat.";

/** Bemby may answer this chat: a booking word came up, or the owner told Bemby to answer it. */
export function chatUnlocked(messages: Message[], words: string[]) {
  return messages.some(
    (m) => (m.author === "system" && m.body.startsWith(BACK_NOTE)) || (m.author === "client" && mentionsTrigger(m.body, words)),
  );
}
