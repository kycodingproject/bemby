import ical, { type VEvent } from "node-ical";
import type { Business } from "../types";
import { zonedTimeToUtc } from "../time";

/** A calendar link the owner pasted (Google "secret address", Apple public calendar, Outlook). */
export interface CalendarFeed {
  id: string;
  label: string;
  url: string;
}

/** Something on the owner's own calendar. Bemby never offers these times to clients. */
export interface BusyBlock {
  start: number; // ms
  end: number;
  title: string;
  source: string;
  allDay: boolean;
}

// Only fetch from the calendar services owners actually use (also keeps the server from being pointed at private addresses).
const ALLOWED_HOSTS: { test: (h: string) => boolean; label: string }[] = [
  { test: (h) => h === "calendar.google.com", label: "Google Calendar" },
  { test: (h) => h === "icloud.com" || h.endsWith(".icloud.com"), label: "Apple Calendar" },
  { test: (h) => ["outlook.live.com", "outlook.office365.com", "outlook.office.com"].includes(h), label: "Outlook" },
];
const MAX_BYTES = 5_000_000;
const CACHE_MS = 3 * 60_000;
const cache = new Map<string, { at: number; text: string }>();

/** Clean up what the owner pasted. Apple gives webcal:// links; they're the same thing over https. */
export function normalizeFeedUrl(input: string): { url: string; label: string } | { error: string } {
  let raw = input.trim();
  if (!raw) return { error: "Paste your calendar link first." };
  raw = raw.replace(/^webcals?:\/\//i, "https://");
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { error: "That doesn't look like a link. Copy the whole calendar address and paste it here." };
  }
  if (u.protocol !== "https:") u.protocol = "https:";
  const host = u.hostname.toLowerCase();
  const match = ALLOWED_HOSTS.find((a) => a.test(host));
  if (!match) return { error: "Use a calendar link from Google Calendar, Apple Calendar (iCloud) or Outlook." };
  if (match.label === "Google Calendar" && !/\/calendar\/ical\//.test(u.pathname)) {
    return { error: 'That\'s a Google Calendar page, not the calendar\'s address. In Google Calendar settings, copy the "Secret address in iCal format" (it ends in .ics).' };
  }
  return { url: u.toString(), label: match.label };
}

async function download(url: string): Promise<string> {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.text;
  let current = url;
  for (let hop = 0; hop < 4; hop++) {
    const host = new URL(current).hostname.toLowerCase();
    if (new URL(current).protocol !== "https:" || !ALLOWED_HOSTS.some((a) => a.test(host))) throw new Error("The calendar link points somewhere unexpected.");
    const res = await fetch(current, { redirect: "manual", signal: AbortSignal.timeout(8000), headers: { accept: "text/calendar, text/plain;q=0.8" }, cache: "no-store" });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      current = new URL(res.headers.get("location")!, current).toString();
      continue;
    }
    if (res.status === 404 || res.status === 403 || res.status === 401) throw new Error("The calendar link isn't working anymore. Copy a fresh link and add it again.");
    if (!res.ok) throw new Error(`The calendar didn't respond (error ${res.status}).`);
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) throw new Error("That calendar is too large to read.");
    const text = new TextDecoder().decode(buf);
    if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error("That link didn't return a calendar. Make sure it's the calendar's iCal address.");
    cache.set(url, { at: Date.now(), text });
    return text;
  }
  throw new Error("The calendar link redirected too many times.");
}

/** Events between two instants, with repeating events expanded. `tz` places all-day events on the right local day. */
export function busyFromIcs(text: string, from: Date, to: Date, tz: string, source: string, opts: { allDayBlocks: boolean }): BusyBlock[] {
  const data = ical.sync.parseICS(text);
  const out: BusyBlock[] = [];
  for (const item of Object.values(data)) {
    if (!item || item.type !== "VEVENT") continue;
    const ev = item as VEvent;
    if (ev.status === "CANCELLED") continue;
    if (ev.transparency === "TRANSPARENT") continue; // marked "free" in the owner's calendar
    if (typeof ev.uid === "string" && ev.uid.endsWith("@bemby")) continue; // our own bookings, already counted
    let instances;
    try {
      instances = ical.expandRecurringEvent(ev, { from: new Date(from.getTime() - 86400_000), to: new Date(to.getTime() + 86400_000), expandOngoing: true, maxIterations: 2000 });
    } catch {
      continue;
    }
    for (const i of instances) {
      let start = i.start.getTime();
      let end = (i.end ?? i.start).getTime();
      if (i.isFullDay) {
        if (!opts.allDayBlocks) continue;
        // All-day events have a date, not a time: block that whole day in the business's time zone.
        const s = i.start, e = i.end ?? i.start;
        start = zonedTimeToUtc(s.getFullYear(), s.getMonth() + 1, s.getDate(), "00:00", tz).getTime();
        end = zonedTimeToUtc(e.getFullYear(), e.getMonth() + 1, e.getDate(), "00:00", tz).getTime();
        if (end <= start) end = start + 86400_000;
      }
      if (end <= start) end = start + 15 * 60_000;
      if (end <= from.getTime() || start >= to.getTime()) continue;
      out.push({ start, end, title: String(i.summary ?? "").trim().slice(0, 80) || "Busy", source, allDay: Boolean(i.isFullDay) });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

export const feedsOf = (b: Business): CalendarFeed[] => (Array.isArray(b.calendar_feeds) ? b.calendar_feeds : []);

/**
 * Busy times from every calendar the owner linked. A calendar that can't be read is skipped (and reported),
 * so one broken link never stops Bemby from booking; every booking still needs the owner's approval.
 */
export async function externalBusy(business: Business, from: Date, to: Date): Promise<{ blocks: BusyBlock[]; problems: { feedId: string; label: string; message: string }[] }> {
  const blocks: BusyBlock[] = [];
  const problems: { feedId: string; label: string; message: string }[] = [];
  await Promise.all(
    feedsOf(business).map(async (f) => {
      try {
        const text = await download(f.url);
        blocks.push(...busyFromIcs(text, from, to, business.timezone, f.label, { allDayBlocks: business.calendar_all_day_blocks !== false }));
      } catch (e) {
        console.error("calendar feed failed", f.label, (e as Error).message);
        problems.push({ feedId: f.id, label: f.label, message: (e as Error).message });
      }
    }),
  );
  return { blocks: blocks.sort((a, b) => a.start - b.start), problems };
}

/** For Settings: is each linked calendar still readable, and how much is on it in the next 30 days? */
export async function feedStatuses(business: Business) {
  const now = new Date();
  return Promise.all(
    feedsOf(business).map(async (f) => {
      try {
        const n = busyFromIcs(await download(f.url), now, new Date(now.getTime() + 30 * 86400_000), business.timezone, f.label, { allDayBlocks: business.calendar_all_day_blocks !== false }).length;
        return { id: f.id, label: f.label, ok: true as const, detail: `${n} event${n === 1 ? "" : "s"} in the next 30 days` };
      } catch (e) {
        return { id: f.id, label: f.label, ok: false as const, detail: (e as Error).message };
      }
    }),
  );
}

/** Check a link right when the owner adds it, so they find out immediately if it's wrong. */
export async function testFeed(url: string, tz: string): Promise<{ ok: true; upcoming: number } | { ok: false; message: string }> {
  try {
    cache.delete(url);
    const text = await download(url);
    const now = new Date();
    return { ok: true, upcoming: busyFromIcs(text, now, new Date(now.getTime() + 30 * 86400_000), tz, "", { allDayBlocks: true }).length };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}
