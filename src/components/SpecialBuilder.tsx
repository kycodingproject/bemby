"use client";

import { useState, useTransition } from "react";
import { draftSpecialCaption, saveSpecial } from "@/app/(app)/actions";

const VIBES = [
  { id: "hype", label: "Hype" },
  { id: "classy", label: "Classy" },
  { id: "sweet", label: "Sweet" },
] as const;

export function SpecialBuilder({ services, today }: { services: { id: string; name: string }[]; today: string }) {
  const weekLater = new Date(Date.parse(today) + 7 * 86400_000).toISOString().slice(0, 10);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [deal, setDeal] = useState("20% off");
  const [startsOn, setStartsOn] = useState(today);
  const [endsOn, setEndsOn] = useState(weekLater);
  const [vibe, setVibe] = useState<(typeof VIBES)[number]["id"]>("hype");
  const [mention, setMention] = useState(true);
  const [caption, setCaption] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const serviceName = services.find((s) => s.id === serviceId)?.name ?? "";
  const dates = `${new Date(startsOn + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}–${new Date(endsOn + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;

  const pill = (on: boolean) => `min-h-11 rounded-full px-4 text-sm font-medium ${on ? "bg-brand-chip text-ink shadow-[inset_0_0_0_1px_rgba(106,75,245,0.6)]" : "bg-soft text-ink-2 shadow-[inset_0_0_0_1px_rgba(26,24,48,0.1)] hover:bg-hover"}`;

  return (
    <div className="flex flex-wrap items-start gap-6">
      <section aria-label="Build a special" className="card flex min-w-0 flex-[1_1_340px] flex-col gap-5 p-6">
        <div className="flex flex-col gap-2.5">
          <span className="text-[13px] text-muted">Service</span>
          <div className="flex flex-wrap gap-2">
            {services.map((s) => (
              <button key={s.id} type="button" className={pill(s.id === serviceId)} aria-pressed={s.id === serviceId} onClick={() => setServiceId(s.id)}>{s.name}</button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-2 text-[13px] text-muted">The deal<input className="input" value={deal} onChange={(e) => setDeal(e.target.value)} /></label>
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-1 basis-36 flex-col gap-2 text-[13px] text-muted">Starts<input className="input" type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} /></label>
          <label className="flex flex-1 basis-36 flex-col gap-2 text-[13px] text-muted">Ends<input className="input" type="date" value={endsOn} min={startsOn} onChange={(e) => setEndsOn(e.target.value)} /></label>
        </div>
        <div className="flex flex-col gap-2.5">
          <span className="text-[13px] text-muted">Vibe</span>
          <div className="flex flex-wrap gap-2">
            {VIBES.map((v) => <button key={v.id} type="button" className={pill(v.id === vibe)} aria-pressed={v.id === vibe} onClick={() => setVibe(v.id)}>{v.label}</button>)}
          </div>
        </div>
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl bg-soft p-4">
          <span>
            <span className="block text-sm font-semibold">Bemby mentions it in chats</span>
            <span className="mt-0.5 block text-[13px] text-muted">When a client asks about {serviceName.toLowerCase() || "this service"}, Bemby brings up the deal.</span>
          </span>
          <input type="checkbox" className="size-5 shrink-0 accent-brand" checked={mention} onChange={(e) => setMention(e.target.checked)} />
        </label>
      </section>

      <section aria-label="Bemby's draft" className="card flex min-w-0 flex-[1_1_340px] flex-col gap-4 p-6">
        <div className="flex items-center gap-2.5"><span className="orb size-[22px]" /><span className="font-display font-semibold">Bemby&apos;s draft</span></div>
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-[300px] w-[170px] shrink-0 flex-col justify-between rounded-[22px] bg-brand-soft p-[18px] shadow-[inset_0_0_0_1px_rgba(106,75,245,0.4),0_12px_28px_rgba(60,40,140,0.15)]">
            <span className="text-[10px] uppercase tracking-[0.12em] text-brand-ink">Story preview</span>
            <span className="font-display text-[22px] font-bold leading-tight">{deal} {serviceName.toLowerCase()}</span>
            <span className="text-xs text-ink-2">{dates} · DM or text to book</span>
          </div>
          <label className="min-w-48 flex-1">
            <span className="sr-only">Caption</span>
            <textarea className="input min-h-[300px] py-3 leading-relaxed" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Tap “Write caption” and Bemby drafts one. You can edit it here." />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => start(async () => setCaption(await draftSpecialCaption({ serviceName, deal, dates, vibe })))}>
            {busy ? "Writing…" : caption ? "Write another version" : "Write caption"}
          </button>
          <button type="button" className="btn btn-ghost" disabled={!caption} onClick={async () => { try { await navigator.clipboard.writeText(caption); setNote("Copied. Paste it into Instagram or your texts."); } catch { setNote("Couldn't copy. Select the text and copy it."); } }}>
            Copy caption
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy || !deal.trim()}
            onClick={() => start(async () => { await saveSpecial({ serviceId, deal, startsOn, endsOn, caption, mention }); setNote(mention ? "Saved. Bemby will mention it in chats." : "Saved."); })}
          >
            Save special
          </button>
        </div>
        {note && <p className="text-[13px] text-ok" role="status">{note}</p>}
      </section>
    </div>
  );
}
