"use client";

import { useState, useTransition } from "react";
import { resetDemoData, simulateClientMessage } from "@/app/(app)/actions";

/** Text your own Bemby as a pretend client to check how it handles a booking. */
export function TestBemby({ businessName, canReset }: { businessName: string; canReset: boolean }) {
  const [text, setText] = useState("");
  const [photos, setPhotos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  return (
    <section className="card flex flex-col gap-3 border-brand/30 bg-brand-soft/40 p-5" aria-label="Try Bemby">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="orb size-6" />
          <p className="font-display font-semibold">Try Bemby: text {businessName} like a client</p>
        </div>
        {canReset ? (
          <button type="button" className="text-sm text-brand-ink underline" onClick={() => start(() => resetDemoData())}>
            Reset demo data
          </button>
        ) : (
          <span className="text-[13px] text-muted">Practice chat. Nothing is sent to a real phone.</span>
        )}
      </div>
      <form
        className="flex flex-wrap gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim() && !photos) return;
          const body = text;
          const labels = photos ? (canReset ? ["Current hair", "Inspo"] : ["Sample photo 1", "Sample photo 2"]) : [];
          setText("");
          setPhotos(false);
          setError(null);
          start(async () => {
            const res = await simulateClientMessage(body, labels);
            if (res && "error" in res && res.error) setError(res.error);
          });
        }}
      >
        <label className="min-w-56 flex-1">
          <span className="sr-only">Your message as a client</span>
          <input className="input bg-card" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. hi! do you have anything friday for a silk press?" />
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={photos} onChange={(e) => setPhotos(e.target.checked)} className="size-5 accent-brand" />
          Attach 2 sample photos
        </label>
        <button className="btn btn-primary" disabled={busy}>{busy ? "Bemby is typing…" : "Send"}</button>
      </form>
      {error && <p className="text-sm text-danger">{error}</p>}
    </section>
  );
}
