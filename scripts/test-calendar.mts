/* eslint-disable @typescript-eslint/no-explicit-any -- test fixtures */
import ical from "node-ical";
import { findOpenSlots, isSlotOpen } from "../src/lib/scheduling.ts";
import { bookingsIcs } from "../src/lib/calendar/feed.ts";
import { testFeed, busyFromIcs } from "../src/lib/calendar/external.ts";
import { zonedTimeToUtc, formatSlot } from "../src/lib/time.ts";
const ok = (n: string, c: boolean) => console.log(c ? "ok  " : "BAD ", n);
const tz = "America/Los_Angeles";
const business: any = { id: "b", name: "Kiara Hair Studio", timezone: tz, min_notice_hours: 0, buffer_minutes: 0, hours: { fri: [{ start: "09:00", end: "17:00" }] } };
const service: any = { id: "s", name: "Silk press", duration_minutes: 120 };
const now = new Date("2026-11-16T20:00:00Z");
const fri = (hhmm: string) => zonedTimeToUtc(2026, 11, 20, hhmm, tz);
const busy = [{ start: fri("14:00").getTime(), end: fri("15:00").getTime() }]; // dentist 2-3pm
const free = findOpenSlots({ business, service, appointments: [], now, days: 7, limit: 40 }).map((s) => formatSlot(s.start, tz));
const withBusy = findOpenSlots({ business, service, appointments: [], busy, now, days: 7, limit: 40 }).map((s) => formatSlot(s.start, tz));
console.log("no calendar :", free.map((x) => x.split(" at ")[1]).join(", "));
console.log("with dentist:", withBusy.map((x) => x.split(" at ")[1]).join(", "));
const slotsBusy = findOpenSlots({ business, service, appointments: [], busy, now, days: 7, limit: 40 });
ok("no offered time overlaps the dentist", slotsBusy.length > 0 && slotsBusy.every((s) => s.end.getTime() <= busy[0].start || s.start.getTime() >= busy[0].end));
ok("1pm was offered before, gone now", free.some((x) => /1:00 PM/.test(x)) && !withBusy.some((x) => /1:00 PM/.test(x)));
ok("booking 1pm (runs into dentist) refused", (isSlotOpen({ business, service, appointments: [], busy, start: fri("13:00"), now }) as any).ok === false);
ok("booking 3pm allowed", isSlotOpen({ business, service, appointments: [], busy, start: fri("15:00"), now }).ok === true);

const appts: any[] = [
  { id: "a1", client_id: "c1", service_id: "s", starts_at: fri("10:00").toISOString(), ends_at: fri("12:00").toISOString(), status: "confirmed", price_cents: 9500, notes: "New client; wants sleek, bouncy finish.\nNo color in a year", intake: { hair_length: "Shoulder length" }, photos: [{}, {}] },
  { id: "a2", client_id: "c2", service_id: "s", starts_at: fri("15:00").toISOString(), ends_at: fri("17:00").toISOString(), status: "requested", price_cents: null, notes: "", intake: {}, photos: [] },
  { id: "a3", client_id: "c1", service_id: "s", starts_at: fri("12:00").toISOString(), ends_at: fri("13:00").toISOString(), status: "declined", notes: "", intake: {}, photos: [] },
];
const out = bookingsIcs(business, appts, [service], [{ id: "c1", name: "Jada M." }, { id: "c2", name: "Tay, the Great; Jr" }] as any);
const parsed = Object.values(ical.sync.parseICS(out)).filter((e: any) => e.type === "VEVENT") as any[];
ok("export has 2 events (declined left out)", parsed.length === 2);
ok("confirmed event title/time", parsed[0].summary === "Silk press · Jada M." && parsed[0].start.toISOString() === fri("10:00").toISOString() && parsed[0].end.toISOString() === fri("12:00").toISOString());
ok("pending marked + special characters survive", parsed[1].summary === "Pending: Silk press · Tay, the Great; Jr" && parsed[1].status === "TENTATIVE");
ok("notes in description", /sleek, bouncy finish/.test(parsed[0].description) && /hair length: Shoulder length/.test(parsed[0].description));
ok("lines are 75 bytes or less", out.split("\r\n").every((l) => Buffer.byteLength(l) <= 75));
ok("Bemby's own events aren't re-imported as busy", busyFromIcs(out, new Date("2026-11-16T00:00:00Z"), new Date("2026-11-23T00:00:00Z"), tz, "x", { allDayBlocks: true }).length === 0);
// Live check (needs internet access to Google): npx tsx scripts/test-calendar.mts --live
if (process.argv.includes("--live")) console.log("live Google calendar fetch:", JSON.stringify(await testFeed("https://calendar.google.com/calendar/ical/en.usa%23holiday%40group.v.calendar.google.com/public/basic.ics", tz)));
