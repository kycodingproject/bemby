"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { approveAppointment, declineAppointment, removeTimeBlock, addTimeBlock } from "@/app/(app)/actions";
import type { MediaRef } from "@/lib/types";
import { PhotoTile } from "./PhotoTile";

export interface CalAppt {
  id: string;
  day: string;
  time: string;
  client: string;
  service: string;
  length: string;
  price: string;
  status: "requested" | "confirmed" | "declined" | "cancelled";
  kind: "new" | "reschedule";
  bemby: boolean;
  source: string;
  moveFrom: string;
  notes: string;
  intake: [string, string][];
  conversationId: string | null;
  photos: (MediaRef & { url?: string | null })[];
}

/** Something on the owner's own Google/Apple calendar (Bemby won't book over it). */
export interface CalBusy {
  day: string;
  sort: number;
  time: string;
  title: string;
  source: string;
}

/** Time the owner blocked off in Bemby. */
export interface CalBlock {
  id: string;
  day: string;
  sort: number;
  allDay: boolean;
  time: string;
  note: string;
  span: string; // "Nov 20 – Nov 24" for multi-day blocks
}

const DOWS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const short = (t: string) => t.replace(":00", "").replace(" ", "").toLowerCase();
const human = (k: string) => k.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export function CalendarView(props: {
  monthLabel: string;
  prevHref: string;
  nextHref: string;
  todayKey: string;
  cells: { key: string; day: number; inMonth: boolean }[];
  items: CalAppt[];
  busy?: CalBusy[];
  blocks?: CalBlock[];
  blocksReady?: boolean;
  initialDay: string;
}) {
  const [sel, setSel] = useState(props.initialDay);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const byDay = useMemo(() => {
    const m = new Map<string, CalAppt[]>();
    for (const it of props.items) {
      if (!m.has(it.day)) m.set(it.day, []);
      m.get(it.day)!.push(it);
    }
    return m;
  }, [props.items]);
  const busyByDay = useMemo(() => {
    const m = new Map<string, CalBusy[]>();
    for (const b of props.busy ?? []) {
      if (!m.has(b.day)) m.set(b.day, []);
      m.get(b.day)!.push(b);
    }
    for (const list of m.values()) list.sort((a, b) => a.sort - b.sort);
    return m;
  }, [props.busy]);
  const dayBusy = busyByDay.get(sel) ?? [];
  const blocksByDay = useMemo(() => {
    const m = new Map<string, CalBlock[]>();
    for (const b of props.blocks ?? []) {
      if (!m.has(b.day)) m.set(b.day, []);
      m.get(b.day)!.push(b);
    }
    for (const list of m.values()) list.sort((a, b) => a.sort - b.sort);
    return m;
  }, [props.blocks]);
  const dayBlocks = blocksByDay.get(sel) ?? [];
  const dayOff = dayBlocks.some((b) => b.allDay);
  const pending = props.items.filter((i) => i.status === "requested").sort((a, b) => a.day.localeCompare(b.day));
  const dayItems = byDay.get(sel) ?? [];
  const selDate = new Date(`${sel}T12:00:00Z`);
  const dayTitle = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" }).format(selDate);

  return (
    <div className="flex flex-wrap items-start gap-6">
      <section aria-label={props.monthLabel} className="card flex min-w-0 flex-[999_1_560px] flex-col gap-3.5 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5">
            <Link href={props.prevHref} className="btn btn-ghost px-3.5" aria-label="Previous month">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
            </Link>
            <h2 className="mx-2 font-display text-[22px] font-semibold">{props.monthLabel}</h2>
            <Link href={props.nextHref} className="btn btn-ghost px-3.5" aria-label="Next month">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
            </Link>
          </div>
          <div className="flex flex-wrap gap-2">
            {pending.length > 0 && (
              <button type="button" className="btn btn-warn" onClick={() => setSel(pending[0].day)}>
                {pending.length} request{pending.length === 1 ? "" : "s"} need{pending.length === 1 ? "s" : ""} your OK
              </button>
            )}
            <Link href="/calendar" className="btn btn-ghost">Today</Link>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-[3px] md:gap-1.5">
          {DOWS.map((d) => <div key={d} className="py-1 text-center text-xs text-muted">{d}</div>)}
          {props.cells.map((c) => {
            const list = byDay.get(c.key) ?? [];
            const nPending = list.filter((x) => x.status === "requested").length;
            const isSel = c.key === sel;
            const cellBlocks = blocksByDay.get(c.key) ?? [];
            const off = cellBlocks.some((b) => b.allDay);
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => { setSel(c.key); setOpen(null); }}
                aria-pressed={isSel}
                aria-label={`${c.key}: ${list.length} appointments${nPending ? `, ${nPending} need your OK` : ""}`}
                className={`flex min-h-14 min-w-0 flex-col items-center gap-1 rounded-[10px] px-0.5 py-1.5 text-left text-xs md:min-h-28 md:items-stretch md:rounded-[14px] md:p-2 ${
                  isSel ? "bg-brand-soft shadow-[inset_0_0_0_2px_var(--color-brand)]" : c.inMonth ? "bg-soft shadow-[inset_0_0_0_1px_rgba(26,24,48,0.05)] hover:bg-hover" : "bg-[#fafafd] text-[#77748f]"
                } ${off ? "cal-off" : ""}`}
              >
                <span className={`flex size-[26px] shrink-0 items-center justify-center rounded-full font-display text-[13px] font-semibold ${c.key === props.todayKey ? "bg-brand text-white" : ""}`}>{c.day}</span>
                {cellBlocks.length > 0 && (
                  <span className="hidden truncate rounded-md bg-[#e9e7f1] px-1.5 py-0.5 text-[11px] font-semibold leading-tight text-ink-2 md:block">
                    {off ? "Off" : `Blocked${cellBlocks.length > 1 ? ` ×${cellBlocks.length}` : ""}`}
                  </span>
                )}
                {list.slice(0, 2).map((x) => (
                  <span
                    key={x.id}
                    className={`hidden truncate rounded-md px-1.5 py-0.5 text-[11px] leading-tight md:block ${
                      x.status === "requested" ? "bg-warn-chip text-warn shadow-[inset_0_0_0_1px_rgba(163,87,10,0.45)]" : x.bemby ? "bg-brand-chip text-brand-chip-ink" : "bg-[#f1eff8] text-ink-2"
                    }`}
                  >
                    {short(x.time)} {x.client.split(" ")[0]}
                  </span>
                ))}
                {list.length > 2 && <span className="hidden pl-1 text-[11px] text-muted md:block">+{list.length - 2} more</span>}
                {list.length < 2 && (busyByDay.get(c.key)?.length ?? 0) > 0 && (
                  <span className="hidden truncate rounded-md border border-dashed border-[rgba(26,24,48,0.25)] px-1.5 py-0.5 text-[11px] leading-tight text-muted md:block">
                    Busy{(busyByDay.get(c.key)?.length ?? 0) > 1 ? ` ×${busyByDay.get(c.key)!.length}` : ""}
                  </span>
                )}
                <span className="flex flex-wrap justify-center gap-[3px] md:hidden">
                  {list.slice(0, 4).map((x) => (
                    <span key={x.id} className="size-1.5 rounded-full" style={{ background: x.status === "requested" ? "var(--color-warn)" : x.bemby ? "var(--color-brand)" : "var(--color-faint)" }} />
                  ))}
                  {list.length === 0 && (busyByDay.get(c.key)?.length ?? 0) > 0 && <span className="size-1.5 rounded-full border border-[rgba(26,24,48,0.4)]" />}
                  {cellBlocks.length > 0 && !off && <span className="size-1.5 rounded-[2px] bg-[#8b88a3]" />}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-brand" />Booked by Bemby</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-faint" />Booked by you</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-warn" />Needs your OK</span>
          {(props.busy?.length ?? 0) > 0 && <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] border border-dashed border-[rgba(26,24,48,0.4)]" />Busy on your calendar</span>}
          {(props.blocks?.length ?? 0) > 0 && <span className="flex items-center gap-1.5"><span className="cal-off size-2.5 rounded-[3px] bg-[#e9e7f1]" />Blocked off</span>}
        </div>
      </section>

      <section aria-label="Selected day" className="card flex min-w-0 flex-[1_1_340px] flex-col gap-4 p-5">
        <div>
          <p className="label">{dayItems.length === 1 ? "1 appointment" : `${dayItems.length} appointments`}</p>
          <h2 className="mt-1 font-display text-[22px] font-semibold">{dayTitle}</h2>
        </div>

        {dayItems.length === 0 && dayBusy.length === 0 && dayBlocks.length === 0 && <p className="rounded-2xl bg-soft p-4 text-sm leading-relaxed text-muted">Open day. Bemby will offer these times to clients who ask.</p>}

        {dayBlocks.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted">{dayOff ? "You're off this day. Bemby won't book anything." : "Blocked off. Bemby won't book these times."}</p>
            {dayBlocks.map((b) => (
              <div key={`${b.id}-${b.day}`} className="cal-off flex items-center gap-3.5 rounded-2xl bg-[#f1eff8] p-3.5 shadow-[inset_0_0_0_1px_rgba(26,24,48,0.1)]">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-display text-[15px] font-semibold">{b.time}</span>
                  <span className="truncate text-[13px] text-muted">{[b.note || "Blocked", b.span].filter(Boolean).join(" · ")}</span>
                </span>
                <button type="button" className="btn btn-ghost bg-card" disabled={busy} onClick={() => start(() => removeTimeBlock(b.id))} aria-label={`Remove block ${b.time}${b.note ? `, ${b.note}` : ""}`}>
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        <BlockTime key={sel} day={sel} ready={props.blocksReady !== false} dayOff={dayOff} />

        {dayBusy.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted">From your calendar. Bemby won&apos;t book over these.</p>
            {dayBusy.map((b, i) => (
              <div key={i} className="flex items-center gap-3.5 rounded-2xl border border-dashed border-[rgba(26,24,48,0.22)] p-3.5">
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-display text-[15px] font-semibold">{b.time}</span>
                  <span className="truncate text-[13px] text-muted">{b.title} · {b.source}</span>
                </span>
              </div>
            ))}
          </div>
        )}

        {dayItems.map((a) =>
          a.status === "requested" ? (
            <article key={a.id} className="flex flex-col gap-3 rounded-[18px] bg-[#fff8ef] p-4 shadow-[inset_0_0_0_1px_rgba(163,87,10,0.4)]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-warn-chip px-2.5 py-1 text-xs font-semibold text-warn">{a.kind === "reschedule" ? "Reschedule" : "New booking"} · needs your OK</span>
                <span className="text-xs text-muted">{a.source}</span>
              </div>
              <p className="font-display text-lg font-semibold">{a.time} · {a.client}</p>
              <p className="text-sm text-ink-2">{[a.service, a.length, a.price].filter(Boolean).join(" · ")}</p>
              {a.moveFrom && <p className="text-[13px] text-warn">{a.moveFrom}</p>}
              <Details a={a} />
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="btn btn-primary" disabled={busy} onClick={() => start(() => approveAppointment(a.id))}>Approve</button>
                <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => start(() => declineAppointment(a.id))}>Decline</button>
                {a.conversationId && <Link href={`/inbox?c=${a.conversationId}`} className="ml-1 text-[13px] text-brand-ink underline">Open chat</Link>}
              </div>
            </article>
          ) : (
            <div key={a.id} className={`overflow-hidden rounded-2xl ${open === a.id ? "bg-[#f6f4ff] shadow-[inset_0_0_0_1px_rgba(106,75,245,0.4)]" : "bg-soft"}`}>
              <button type="button" aria-expanded={open === a.id} onClick={() => setOpen(open === a.id ? null : a.id)} className="flex min-h-16 w-full items-center gap-3.5 p-3.5 text-left hover:bg-hover">
                <span className="w-1 self-stretch rounded" style={{ background: a.bemby ? "var(--color-brand)" : "var(--color-faint)" }} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="font-display text-[15px] font-semibold">{a.time} · {a.client}</span>
                  <span className="text-[13px] text-muted">{a.service} · {a.bemby ? "Booked by Bemby" : "Booked by you"}</span>
                </span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-muted)" strokeWidth="2" aria-hidden="true" className={open === a.id ? "rotate-180" : ""}><path d="M6 9l6 6 6-6" /></svg>
              </button>
              {open === a.id && (
                <div className="flex flex-col gap-3 px-3.5 pb-3.5">
                  <p className="flex flex-wrap gap-3.5 text-[13px] text-ink-2">{[a.length, a.price, a.source].filter(Boolean).map((t) => <span key={t}>{t}</span>)}</p>
                  <Details a={a} />
                  {a.conversationId && <Link href={`/inbox?c=${a.conversationId}`} className="text-[13px] text-brand-ink underline">Open chat with {a.client.split(" ")[0]}</Link>}
                </div>
              )}
            </div>
          ),
        )}
      </section>
    </div>
  );
}

function Details({ a }: { a: CalAppt }) {
  return (
    <>
      {a.photos.length > 0 && (
        <div className="flex gap-2.5">
          {a.photos.map((p, i) => <PhotoTile key={i} media={p} className="h-32 flex-1" />)}
        </div>
      )}
      {(a.notes || a.intake.length > 0) && (
        <div className="rounded-xl bg-card px-3.5 py-3 text-[13px] leading-relaxed text-ink-2 shadow-[inset_0_0_0_1px_rgba(26,24,48,0.06)]">
          <span className="mb-1 block text-xs text-brand-ink">{a.bemby ? "Bemby's notes" : "Your notes"}</span>
          {a.notes}
          {a.intake.length > 0 && (
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              {a.intake.map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-muted">{human(k)}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </>
  );
}

const TIMES = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`);
const timeLabel = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};

/** "Block time" for the selected day: the whole day (or a run of days) or part of it. */
function BlockTime({ day, ready, dayOff }: { day: string; ready: boolean; dayOff: boolean }) {
  const [open, setOpen] = useState(false);
  const [allDay, setAllDay] = useState(true);
  const [through, setThrough] = useState(day);
  const [startT, setStartT] = useState("12:00");
  const [endT, setEndT] = useState("13:00");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();

  if (!open) {
    return (
      <div className="flex flex-col gap-2">
        {!dayOff && <button type="button" className="btn btn-ghost self-start" onClick={() => { setOpen(true); setMsg(null); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></svg>
          Block time
        </button>}
        {msg && <p role="status" className={`text-sm ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.text}</p>}
      </div>
    );
  }
  const sel = "input min-h-11 bg-card";
  return (
    <form
      className="flex flex-col gap-3 rounded-2xl bg-soft p-4"
      onSubmit={(e) => {
        e.preventDefault();
        setMsg(null);
        start(async () => {
          const r = await addTimeBlock({ date: day, through: allDay ? through : undefined, allDay, start: startT, end: endT, note });
          if (r && "error" in r && r.error) setMsg({ ok: false, text: r.error });
          else {
            setMsg({ ok: true, text: (r && "message" in r && r.message) || "Blocked." });
            setOpen(false);
            setNote("");
          }
        });
      }}
    >
      <p className="text-sm font-semibold">Block time</p>
      {!ready && <p className="text-[13px] text-warn">Run supabase/migrations/0011_time_blocks.sql in Supabase to turn this on.</p>}
      <div role="radiogroup" aria-label="What to block" className="flex gap-2">
        {[
          { v: true, t: "Whole day" },
          { v: false, t: "Certain hours" },
        ].map((o) => (
          <button
            key={o.t}
            type="button"
            role="radio"
            aria-checked={allDay === o.v}
            onClick={() => setAllDay(o.v)}
            className={`min-h-10 flex-1 rounded-xl text-sm font-semibold ${allDay === o.v ? "bg-brand text-white" : "bg-card shadow-[inset_0_0_0_1px_rgba(26,24,48,0.12)] hover:bg-hover"}`}
          >
            {o.t}
          </button>
        ))}
      </div>
      {allDay ? (
        <label className="flex flex-col gap-1.5 text-[13px] text-muted">
          Through (for a vacation or several days off)
          <input type="date" className={sel} value={through} min={day} onChange={(e) => setThrough(e.target.value || day)} />
        </label>
      ) : (
        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1.5 text-[13px] text-muted">
            From
            <select className={sel} value={startT} onChange={(e) => setStartT(e.target.value)}>
              {TIMES.map((t) => <option key={t} value={t}>{timeLabel(t)}</option>)}
            </select>
          </label>
          <label className="flex flex-1 flex-col gap-1.5 text-[13px] text-muted">
            To
            <select className={sel} value={endT} onChange={(e) => setEndT(e.target.value)}>
              {TIMES.map((t) => <option key={t} value={t}>{timeLabel(t)}</option>)}
            </select>
          </label>
        </div>
      )}
      <label className="flex flex-col gap-1.5 text-[13px] text-muted">
        Note for you (optional, clients never see it)
        <input className={sel} value={note} maxLength={80} onChange={(e) => setNote(e.target.value)} placeholder={allDay ? "e.g. Vacation" : "e.g. Lunch, school pickup"} />
      </label>
      {msg && !msg.ok && <p role="alert" className="text-sm text-danger">{msg.text}</p>}
      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={busy}>{busy ? "Saving…" : "Block it"}</button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}
