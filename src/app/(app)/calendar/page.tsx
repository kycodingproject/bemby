import { currentBusinessId, getRepo } from "@/lib/repo";
import { photoUrl } from "@/lib/media";
import { addDaysLocal, formatSlot, formatTime, localDateKey, zonedParts, zonedTimeToUtc } from "@/lib/time";
import { CalendarView, type CalAppt, type CalBlock, type CalBusy } from "@/components/CalendarView";
import { externalBusy } from "@/lib/calendar/external";
import Link from "next/link";
import { PageHeader } from "@/components/icons";

const CHANNEL = { sms: "text", instagram: "Instagram", tiktok: "TikTok" } as const;

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ m?: string; pending?: string }> }) {
  const repo = getRepo();
  const business = (await repo.getBusiness(await currentBusinessId()))!;
  const tz = business.timezone;
  const sp = await searchParams;
  const now = new Date();
  const today = zonedParts(now, tz);
  const [year, month] = sp.m && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m.split("-").map(Number) : [today.year, today.month];

  // Monday-start grid covering the whole month
  const firstDow = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cellsCount = Math.ceil((firstDow + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: cellsCount }, (_, i) => {
    const d = addDaysLocal(year, month, 1, i - firstDow);
    return { key: `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`, day: d.day, inMonth: d.month === month };
  });
  const from = zonedTimeToUtc(...(cells[0].key.split("-").map(Number) as [number, number, number]), "00:00", tz);
  const to = new Date(from.getTime() + (cellsCount + 1) * 86400_000);

  const appts = (await repo.listAppointments(business.id, from.toISOString(), to.toISOString())).filter((a) => a.status === "requested" || a.status === "confirmed");
  const services = await repo.listServices(business.id);
  const clients = new Map((await repo.listClients(business.id)).map((c) => [c.id, c]));
  const convos = new Map((await repo.listConversations(business.id)).map((c) => [c.id, c]));

  const items: CalAppt[] = await Promise.all(
    appts.map(async (a) => {
      const svc = services.find((s) => s.id === a.service_id);
      const replaces = a.replaces_appointment_id ? await repo.getAppointment(a.replaces_appointment_id) : null;
      const channel = a.conversation_id ? convos.get(a.conversation_id)?.channel : undefined;
      return {
        id: a.id,
        day: localDateKey(a.starts_at, tz),
        time: formatTime(a.starts_at, tz),
        client: clients.get(a.client_id)?.name ?? "Client",
        service: svc?.name ?? "Appointment",
        length: svc ? `${Math.floor(svc.duration_minutes / 60) ? `${Math.floor(svc.duration_minutes / 60)} hr ` : ""}${svc.duration_minutes % 60 ? `${svc.duration_minutes % 60} min` : ""}`.trim() : "",
        price: a.price_cents != null ? `$${a.price_cents / 100}` : "",
        status: a.status,
        kind: a.kind,
        bemby: a.source === "ai",
        source: a.source === "ai" ? `Booked by Bemby${channel ? ` via ${CHANNEL[channel]}` : ""}` : "Added by you",
        moveFrom: replaces ? `Moving from ${formatSlot(replaces.starts_at, tz)}` : "",
        notes: a.notes,
        intake: Object.entries(a.intake ?? {}),
        conversationId: a.conversation_id,
        photos: await Promise.all(a.photos.map(async (p) => ({ ...p, url: await photoUrl(p) }))),
      };
    }),
  );

  // Events from the owner's linked Google/Apple calendars, one row per day they touch.
  const ext = await externalBusy(business, from, to);
  const busy: CalBusy[] = [];
  for (const b of ext.blocks) {
    for (let t = b.start, n = 0; t < b.end && n < 45; n++) {
      const day = localDateKey(new Date(t), tz);
      const [y, m, d] = day.split("-").map(Number);
      const next = addDaysLocal(y, m, d, 1);
      const dayEnd = zonedTimeToUtc(next.year, next.month, next.day, "00:00", tz).getTime();
      const end = Math.min(b.end, dayEnd);
      const whole = t <= zonedTimeToUtc(y, m, d, "00:00", tz).getTime() && end >= dayEnd;
      busy.push({ day, sort: t, time: b.allDay || whole ? "All day" : `${formatTime(new Date(t), tz)} – ${formatTime(new Date(end), tz)}`, title: b.title, source: b.source });
      t = dayEnd;
    }
  }

  // Time the owner blocked in Bemby, one row per day it covers.
  const ownBlocks = await repo.listBlocks(business.id, from.toISOString(), to.toISOString()).catch(() => null);
  const dayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: tz });
  const blocks: CalBlock[] = [];
  for (const b of ownBlocks ?? []) {
    const s = new Date(b.starts_at).getTime(), e = new Date(b.ends_at).getTime();
    const multi = b.all_day && e - s > 86400_000 + 3600_000;
    const span = multi ? `${dayFmt.format(s)} – ${dayFmt.format(e - 1)}` : "";
    for (let t = s, n = 0; t < e && n < 130; n++) {
      const day = localDateKey(new Date(t), tz);
      const [y, m, d] = day.split("-").map(Number);
      const nx = addDaysLocal(y, m, d, 1);
      const dayEnd = zonedTimeToUtc(nx.year, nx.month, nx.day, "00:00", tz).getTime();
      const end = Math.min(e, dayEnd);
      const whole = b.all_day || (t <= zonedTimeToUtc(y, m, d, "00:00", tz).getTime() && end >= dayEnd);
      blocks.push({ id: b.id, day, sort: t, allDay: whole, time: whole ? "All day" : `${formatTime(new Date(t), tz)} – ${formatTime(new Date(end), tz)}`, note: b.note ?? "", span });
      t = dayEnd;
    }
  }

  const todayKey = localDateKey(now, tz);
  const firstPending = items.filter((i) => i.status === "requested").sort((a, b) => a.day.localeCompare(b.day))[0];
  const initialDay = sp.pending && firstPending ? firstPending.day : cells.some((c) => c.key === todayKey) ? todayKey : cells.find((c) => c.inMonth)!.key;
  const prev = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, "0")}`;
  const next = month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, "0")}`;
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 15)));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader icon="calendar" title="Calendar" sub="Tap a day to see it or block off time. Gold appointments are waiting for your OK." />
      {ext.problems.length > 0 && (
        <p role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn shadow-[inset_0_0_0_1px_rgba(163,87,10,0.25)]">
          <span>Bemby can&apos;t read your {ext.problems.map((p) => p.label).join(" and ")} right now, so those events aren&apos;t blocking times. {ext.problems[0].message}</span>
          <Link href="/settings?tab=calendar" className="btn btn-warn min-h-10">Fix in Settings</Link>
        </p>
      )}
      <CalendarView
        key={`${year}-${month}`}
        busy={busy}
        blocks={blocks}
        blocksReady={ownBlocks !== null}
        monthLabel={monthLabel}
        prevHref={`/calendar?m=${prev}`}
        nextHref={`/calendar?m=${next}`}
        todayKey={todayKey}
        cells={cells}
        items={items}
        initialDay={initialDay}
      />
    </div>
  );
}
