import type { Appointment, Business, Service } from "./types";
import { addDaysLocal, zonedParts, zonedTimeToUtc } from "./time";

export interface Slot {
  start: Date;
  end: Date;
}

const STEP_MINUTES = 30;

/**
 * Open start times for a service between `from` and `from + days`.
 * Respects business hours, minimum notice, buffer between appointments,
 * and existing requested/confirmed appointments.
 */
export function findOpenSlots(opts: {
  business: Business;
  service: Service;
  appointments: Appointment[];
  now: Date;
  from?: Date;
  days?: number;
  limit?: number;
}): Slot[] {
  const { business, service, appointments, now } = opts;
  const tz = business.timezone;
  const days = opts.days ?? 14;
  const limit = opts.limit ?? 8;
  const earliest = new Date(Math.max(now.getTime() + business.min_notice_hours * 3600_000, (opts.from ?? now).getTime()));
  const busy = appointments
    .filter((a) => a.status === "requested" || a.status === "confirmed")
    .map((a) => ({
      start: new Date(a.starts_at).getTime() - business.buffer_minutes * 60_000,
      end: new Date(a.ends_at).getTime() + business.buffer_minutes * 60_000,
    }));
  const durMs = service.duration_minutes * 60_000;
  const start = zonedParts(opts.from ?? now, tz);
  const out: Slot[] = [];

  for (let i = 0; i < days && out.length < limit; i++) {
    const d = addDaysLocal(start.year, start.month, start.day, i);
    const windows = business.hours[d.dayKey] ?? [];
    for (const w of windows) {
      const wStart = zonedTimeToUtc(d.year, d.month, d.day, w.start, tz).getTime();
      const wEnd = zonedTimeToUtc(d.year, d.month, d.day, w.end, tz).getTime();
      for (let t = wStart; t + durMs <= wEnd && out.length < limit; t += STEP_MINUTES * 60_000) {
        if (t < earliest.getTime()) continue;
        const clash = busy.some((b) => t < b.end && t + durMs > b.start);
        if (!clash) out.push({ start: new Date(t), end: new Date(t + durMs) });
      }
    }
  }
  return spreadOut(out, limit);
}

/** Prefer offering a spread of days rather than 8 back-to-back times on one day. */
function spreadOut(slots: Slot[], limit: number) {
  const byDay = new Map<string, Slot[]>();
  for (const s of slots) {
    const k = s.start.toISOString().slice(0, 10);
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(s);
  }
  const picked: Slot[] = [];
  let round = 0;
  while (picked.length < limit) {
    let added = false;
    for (const list of byDay.values()) {
      const idx = round === 0 ? 0 : Math.floor((list.length - 1) * (round / 3));
      const s = list[idx];
      if (s && !picked.includes(s) && picked.length < limit) {
        picked.push(s);
        added = true;
      }
    }
    round++;
    if (!added || round > 3) break;
  }
  return picked.sort((a, b) => a.start.getTime() - b.start.getTime());
}

export function isSlotOpen(opts: {
  business: Business;
  service: Service;
  appointments: Appointment[];
  start: Date;
  now: Date;
  ignoreAppointmentId?: string;
}): { ok: true; end: Date } | { ok: false; reason: string } {
  const { business, service, start, now } = opts;
  const tz = business.timezone;
  const end = new Date(start.getTime() + service.duration_minutes * 60_000);
  if (start.getTime() < now.getTime() + business.min_notice_hours * 3600_000) return { ok: false, reason: "too soon" };
  const p = zonedParts(start, tz);
  const windows = business.hours[p.dayKey] ?? [];
  const inHours = windows.some((w) => {
    const ws = zonedTimeToUtc(p.year, p.month, p.day, w.start, tz).getTime();
    const we = zonedTimeToUtc(p.year, p.month, p.day, w.end, tz).getTime();
    return start.getTime() >= ws && end.getTime() <= we;
  });
  if (!inHours) return { ok: false, reason: "outside business hours" };
  const buf = business.buffer_minutes * 60_000;
  const clash = opts.appointments.some(
    (a) =>
      a.id !== opts.ignoreAppointmentId &&
      (a.status === "requested" || a.status === "confirmed") &&
      start.getTime() < new Date(a.ends_at).getTime() + buf &&
      end.getTime() > new Date(a.starts_at).getTime() - buf,
  );
  if (clash) return { ok: false, reason: "already booked" };
  return { ok: true, end };
}
