/* eslint-disable @typescript-eslint/no-explicit-any -- test fixtures */
import { MemoryRepo } from "../src/lib/repo/memory";
import { seedDemo } from "../src/lib/repo/seed";
import { busyTimes } from "../src/lib/calendar/busy";
import { findOpenSlots, isSlotOpen } from "../src/lib/scheduling";
import { zonedTimeToUtc, formatSlot } from "../src/lib/time";
const ok = (n: string, c: boolean) => console.log(c ? "ok  " : "BAD ", n);
const repo = new MemoryRepo(seedDemo(new Date("2026-11-16T18:00:00Z")));
const b = { ...repo.db.businesses[0], min_notice_hours: 0, calendar_feeds: [] } as any;
const tz = b.timezone;
const svc = repo.db.services.find((s) => s.duration_minutes <= 90)!;
const now = new Date("2026-11-16T18:00:00Z");
// Lunch block Thu 12-1, whole Fri-Sat off
await repo.addBlock({ business_id: b.id, starts_at: zonedTimeToUtc(2026, 11, 19, "12:00", tz).toISOString(), ends_at: zonedTimeToUtc(2026, 11, 19, "13:00", tz).toISOString(), all_day: false, note: "Lunch" });
await repo.addBlock({ business_id: b.id, starts_at: zonedTimeToUtc(2026, 11, 20, "00:00", tz).toISOString(), ends_at: zonedTimeToUtc(2026, 11, 22, "00:00", tz).toISOString(), all_day: true, note: "Vacation" });
const from = zonedTimeToUtc(2026, 11, 17, "00:00", tz), to = zonedTimeToUtc(2026, 11, 24, "00:00", tz);
const busy = await busyTimes(repo, b, from, to);
ok("both blocks count as busy", busy.length === 2);
const appts = await repo.listAppointments(b.id, from.toISOString(), to.toISOString());
const slots = findOpenSlots({ business: b, service: svc, appointments: appts, busy, now, from, days: 7, limit: 80 });
const days = new Set(slots.map((s) => formatSlot(s.start, tz).split(" at ")[0]));
console.log("days offered:", [...days].join(", "));
ok("nothing offered Fri or Sat (vacation)", ![...days].some((d) => /Fri|Sat/.test(d)));
ok("nothing offered during Thu lunch", !slots.some((s) => s.start.getTime() < busy[0].end && s.end.getTime() > busy[0].start));
const r: any = isSlotOpen({ business: b, service: svc, appointments: appts, busy, start: zonedTimeToUtc(2026, 11, 20, "11:00", tz), now });
ok("client asking for Fri 11am is refused", r.ok === false);
