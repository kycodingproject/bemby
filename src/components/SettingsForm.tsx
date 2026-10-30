"use client";

import { useState, useTransition } from "react";
import { DEFAULT_TRIGGER_WORDS } from "@/lib/triggers";
import { updateSettings } from "@/app/(app)/actions";
import type { AskFirstKey, Autonomy } from "@/lib/types";

const MODES: { id: Autonomy; title: string; desc: string }[] = [
  { id: "auto", title: "Reply on its own", desc: "Bemby answers and books. You just approve appointments." },
  { id: "approve_all", title: "Ask me first", desc: "Bemby drafts every reply. Nothing sends until you tap OK." },
  { id: "situational", title: "Depends on the situation", desc: "Bemby handles the routine stuff and checks with you on the rest." },
];

const RULES: { key: AskFirstKey; label: string }[] = [
  { key: "new_client", label: "It's a brand-new client" },
  { key: "reschedule", label: "Someone wants to reschedule" },
  { key: "discount", label: "A client asks for a discount or price exception" },
  { key: "off_menu", label: "The service isn't on my menu" },
  { key: "upset", label: "A client sounds upset" },
  { key: "every_booking", label: "Every booking, no matter what" },
];

const DELAYS: { s: number; label: string }[] = [
  { s: 0, label: "Right away" },
  { s: 30, label: "30 sec" },
  { s: 60, label: "1 min" },
  { s: 120, label: "2 min" },
];

export function SettingsForm(props: { autonomy: Autonomy; askFirst: Record<AskFirstKey, boolean>; paused: boolean; replyDelay: number; triggerWords: string[]; serviceNames: string[] }) {
  const [busy, start] = useTransition();
  const [words, setWords] = useState(props.triggerWords.join(", "));
  const [saved, setSaved] = useState(false);
  return (
    <section aria-label="How Bemby replies" className="card flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold">How Bemby replies</h2>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => start(() => updateSettings({ paused: !props.paused }))}>
          {props.paused ? "Resume Bemby" : "Pause Bemby"}
        </button>
      </div>
      {props.paused && <p className="rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">Bemby is paused. New messages wait in your inbox for you to answer.</p>}
      <div role="radiogroup" aria-label="Reply mode" className="flex flex-wrap gap-3">
        {MODES.map((m) => {
          const on = props.autonomy === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={busy}
              onClick={() => start(() => updateSettings({ autonomy: m.id }))}
              className={`flex min-w-52 flex-1 flex-col gap-1.5 rounded-[18px] p-4 text-left text-sm ${on ? "bg-brand-soft shadow-[inset_0_0_0_2px_var(--color-brand)]" : "bg-soft shadow-[inset_0_0_0_1px_rgba(26,24,48,0.08)] hover:bg-hover"}`}
            >
              <span className="font-display text-[15px] font-semibold">{m.title}</span>
              <span className="leading-relaxed text-muted">{m.desc}</span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-col gap-2 rounded-2xl bg-soft p-4">
        <p className="text-sm font-semibold">Only answer booking chats</p>
        <p className="text-[13px] leading-relaxed text-muted">
          Bemby stays quiet in chats with friends, family and random DMs. It only replies once someone uses a booking word or names one of your services. You can also tap
          &ldquo;Let Bemby answer&rdquo; on any chat in your Inbox, and if you reply to someone yourself in Instagram or Messenger, Bemby steps back from that chat.
        </p>
        <p className="text-[13px] text-muted">Words that wake Bemby up:</p>
        <ul className="flex flex-wrap gap-1.5" aria-label="Built-in booking words">
          {[...DEFAULT_TRIGGER_WORDS, ...props.serviceNames.map((n) => n.toLowerCase())].map((w) => (
            <li key={w} className="rounded-full bg-card px-2.5 py-1 text-xs text-ink-2 shadow-[inset_0_0_0_1px_rgba(26,24,48,0.1)]">{w}</li>
          ))}
        </ul>
        <form
          className="mt-1 flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSaved(false);
            start(async () => {
              await updateSettings({ trigger_words: words.split(",") });
              setSaved(true);
            });
          }}
        >
          <label className="flex min-w-60 flex-1 flex-col gap-1.5 text-[13px] text-muted">
            Your own words (separate with commas)
            <input className="input" value={words} onChange={(e) => { setWords(e.target.value); setSaved(false); }} placeholder="e.g. braids, touch up, fill" />
          </label>
          <button className="btn btn-ghost" disabled={busy}>Save words</button>
          {saved && <span role="status" className="text-sm text-ok">Saved</span>}
        </form>
      </div>
      <div className="flex flex-col gap-2 rounded-2xl bg-soft p-4">
        <p className="text-sm font-semibold">Wait before replying</p>
        <p className="text-[13px] leading-relaxed text-muted">
          Gives clients time to send all their messages and photos. If they send another one, Bemby waits again, then answers everything at once.
        </p>
        <div role="radiogroup" aria-label="Wait before replying" className="mt-1 flex flex-wrap gap-2">
          {DELAYS.map((d) => {
            const on = props.replyDelay === d.s;
            return (
              <button
                key={d.s}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={busy}
                onClick={() => start(() => updateSettings({ reply_delay_seconds: d.s }))}
                className={`min-h-11 rounded-full px-4 text-sm font-semibold ${on ? "bg-brand text-white" : "bg-card shadow-[inset_0_0_0_1px_rgba(26,24,48,0.12)] hover:bg-hover"}`}
              >
                {d.label}
              </button>
            );
          })}
        </div>
      </div>
      {props.autonomy === "situational" && (
        <fieldset className="flex flex-col gap-1 rounded-2xl bg-soft p-4">
          <legend className="sr-only">Ask me first when</legend>
          <p className="mb-1.5 text-[13px] text-muted">Ask me first when…</p>
          {RULES.map((r) => (
            <label key={r.key} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="size-5 accent-brand"
                checked={props.askFirst[r.key]}
                disabled={busy}
                onChange={(e) => start(() => updateSettings({ ask_first: { [r.key]: e.target.checked } }))}
              />
              {r.label}
            </label>
          ))}
        </fieldset>
      )}
    </section>
  );
}
