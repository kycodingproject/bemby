import type { DayKey } from "./types";

const DAY_KEYS: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** Wall-clock parts of an instant in a given IANA time zone. */
export function zonedParts(date: Date, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
  });
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(date)) p[part.type] = part.value;
  return {
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
    dayKey: p.weekday.slice(0, 3).toLowerCase() as DayKey,
  };
}

/** Offset (ms) of the zone from UTC at a given instant. */
function offsetMs(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Convert a wall-clock time in a zone (y, m 1-12, d, "HH:MM") to a UTC Date. Handles DST. */
export function zonedTimeToUtc(year: number, month: number, day: number, hhmm: string, timeZone: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const guess = Date.UTC(year, month - 1, day, h, m);
  const first = guess - offsetMs(new Date(guess), timeZone);
  const second = guess - offsetMs(new Date(first), timeZone);
  return new Date(second);
}

export function dayKeyOf(date: Date, timeZone: string): DayKey {
  return zonedParts(date, timeZone).dayKey;
}

export function addDaysLocal(year: number, month: number, day: number, n: number) {
  const d = new Date(Date.UTC(year, month - 1, day + n));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(), dayKey: DAY_KEYS[d.getUTCDay()] };
}

/** "Fri, Oct 30 at 2:00 PM" in the business's zone. */
export function formatSlot(date: Date | string, timeZone: string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", month: "short", day: "numeric" }).format(d);
  const time = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(d);
  return `${day} at ${time}`;
}

export function formatTime(date: Date | string, timeZone: string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" }).format(d);
}

/** Local calendar date "YYYY-MM-DD" of an instant in a zone. */
export function localDateKey(date: Date | string, timeZone: string) {
  const p = zonedParts(typeof date === "string" ? new Date(date) : date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}
