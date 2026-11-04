import type { Message } from "./types";

/** Words that only close a chat ("ok thank you so much!!", "perfect see you then", "👍"). */
const CLOSER_WORDS = new Set(
  ("thanks thank thankyou thanku you u ty tysm thx tx so much very again ok okay okk k kk cool perfect great awesome amazing sweet " +
    "nice sounds good see ya you then soon bye byee goodbye got it will do appreciate appreciated it love lovely girl sis babe hun " +
    "alright aight bet yay lol haha omg have a day night weekend too same you're youre welcome np").split(" "),
);

/** True when a message is just thanks / ok / an emoji, with nothing to answer. */
export function isCloser(m: Pick<Message, "body" | "media">) {
  if (m.media?.length) return false;
  const words = m.body.toLowerCase().replace(/['’]/g, "").match(/[a-z]+/g) ?? [];
  if (!words.length) return /\p{Extended_Pictographic}/u.test(m.body); // emoji-only like 👍 or ❤️
  return words.length <= 10 && words.every((w) => CLOSER_WORDS.has(w));
}

/**
 * Bemby says one friendly sign-off at most. If the client keeps saying thanks after that, it stays quiet.
 * It never skips a "perfect, thanks" that answers a question Bemby asked (like "Does Friday at 2 work?").
 */
export function shouldStaySilent(messages: Message[]) {
  const chat = messages.filter((m) => m.author !== "system" && m.status !== "discarded" && m.status !== "failed");
  const lastOut = chat.findLastIndex((m) => m.author === "ai" || m.author === "owner");
  if (lastOut < 0) return false;
  const newest = chat.slice(lastOut + 1).filter((m) => m.author === "client");
  if (!newest.length || !newest.every(isCloser)) return false;
  if (chat[lastOut].body.includes("?")) return false; // they may be answering a question
  // What was our last message replying to? If that was also just thanks, we've already signed off.
  const prevOut = chat.slice(0, lastOut).findLastIndex((m) => m.author === "ai" || m.author === "owner");
  const before = chat.slice(prevOut + 1, lastOut).filter((m) => m.author === "client");
  return before.length > 0 && before.every(isCloser);
}
