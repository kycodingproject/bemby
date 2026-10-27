"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { approveAppointment, declineAppointment } from "@/app/(app)/actions";
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
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => { setSel(c.key); setOpen(null); }}
                aria-pressed={isSel}
                aria-label={`${c.key}: ${list.length} appointments${nPending ? `, ${nPending} need your OK` : ""}`}
                className={`flex min-h-14 min-w-0 flex-col items-center gap-1 rounded-[10px] px-0.5 py-1.5 text-left text-xs md:min-h-28 md:items-stretch md:rounded-[14px] md:p-2 ${
                  isSel ? "bg-brand-soft shadow-[inset_0_0_0_2px_var(--color-brand)]" : c.inMonth ? "bg-soft shadow-[inset_0_0_0_1px_rgba(26,24,48,0.05)] hover:bg-hover" : "bg-[#fafafd] text-[#77748f]"
                }`}
              >
                <span className={`flex size-[26px] shrink-0 items-center justify-center rounded-full font-display text-[13px] font-semibold ${c.key === props.todayKey ? "bg-brand text-white" : ""}`}>{c.day}</span>
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
                <span className="flex flex-wrap justify-center gap-[3px] md:hidden">
                  {list.slice(0, 4).map((x) => (
                    <span key={x.id} className="size-1.5 rounded-full" style={{ background: x.status === "requested" ? "var(--color-warn)" : x.bemby ? "var(--color-brand)" : "var(--color-faint)" }} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-muted">
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-brand" />Booked by Bemby</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-faint" />Booked by you</span>
          <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-[3px] bg-warn" />Needs your OK</span>
        </div>
      </section>

      <section aria-label="Selected day" className="card flex min-w-0 flex-[1_1_340px] flex-col gap-4 p-5">
        <div>
          <p className="label">{dayItems.length === 1 ? "1 appointment" : `${dayItems.length} appointments`}</p>
          <h2 className="mt-1 font-display text-[22px] font-semibold">{dayTitle}</h2>
        </div>

        {dayItems.length === 0 && <p className="rounded-2xl bg-soft p-4 text-sm leading-relaxed text-muted">Open day. Bemby will offer these times to clients who ask.</p>}

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
