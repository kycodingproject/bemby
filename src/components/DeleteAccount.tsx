"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "@/app/(app)/actions";

export function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, start] = useTransition();
  return (
    <section aria-labelledby="delete-h" className="card flex flex-col gap-3 p-6">
      <h2 id="delete-h" className="font-display text-xl font-semibold">Delete account</h2>
      <p className="text-sm text-muted">
        Cancels your plan and permanently deletes your business, services, conversations, appointments, client photos and connected accounts. This can&apos;t be undone.
      </p>
      {!open ? (
        <button type="button" className="btn btn-ghost self-start text-danger" onClick={() => setOpen(true)}>Delete my account…</button>
      ) : (
        <form
          className="flex flex-wrap items-end gap-2.5 rounded-2xl bg-warn-soft p-4"
          onSubmit={(e) => {
            e.preventDefault();
            setErr(null);
            start(async () => {
              const r = await deleteAccount(text);
              if (r?.error) setErr(r.error);
            });
          }}
        >
          <label className="flex min-w-56 flex-1 flex-col gap-1.5 text-[13px] text-ink-2">
            Type DELETE to confirm
            <input className="input bg-card" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" />
          </label>
          <button className="btn bg-danger text-white hover:opacity-90" disabled={busy || text.trim().toUpperCase() !== "DELETE"}>
            {busy ? "Deleting…" : "Permanently delete"}
          </button>
          <button type="button" className="btn btn-ghost bg-card" onClick={() => { setOpen(false); setText(""); }}>Cancel</button>
          {err && <p role="alert" className="w-full text-sm text-danger">{err}</p>}
        </form>
      )}
    </section>
  );
}
