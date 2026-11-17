"use client";

import { useState, useTransition } from "react";
import { addOwnTraining, answerTraining, deleteTraining, reopenTraining } from "@/app/(app)/actions";

interface Item {
  id: string;
  question: string;
  answer: string;
  fromChat: boolean;
}

export function TrainingList(props: { answered: Item[]; open: Item[]; skipped: Item[] }) {
  return (
    <div className="flex flex-col gap-6">
      <AddOwn />
      <section aria-labelledby="ans-h" className="card flex flex-col gap-3 p-6">
        <h2 id="ans-h" className="font-display text-xl font-semibold">Answers ({props.answered.length})</h2>
        {props.answered.length === 0 && <p className="text-sm text-muted">Nothing yet. Answer your daily questions on Home, or add your own above.</p>}
        <ul className="flex flex-col gap-2.5">
          {props.answered.map((q) => <Row key={q.id} item={q} />)}
        </ul>
      </section>
      {props.open.length > 0 && (
        <section aria-labelledby="open-h" className="card flex flex-col gap-3 p-6">
          <h2 id="open-h" className="font-display text-xl font-semibold">Still to answer ({props.open.length})</h2>
          <p className="text-sm text-muted">These come up on Home a few at a time. You can answer any of them now.</p>
          <ul className="flex flex-col gap-2.5">
            {props.open.map((q) => <Row key={q.id} item={q} startEditing={false} unanswered />)}
          </ul>
        </section>
      )}
      {props.skipped.length > 0 && (
        <section aria-labelledby="skip-h" className="card flex flex-col gap-3 p-6">
          <h2 id="skip-h" className="font-display text-xl font-semibold">Skipped ({props.skipped.length})</h2>
          <ul className="flex flex-col gap-2">
            {props.skipped.map((q) => <Skipped key={q.id} item={q} />)}
          </ul>
        </section>
      )}
    </div>
  );
}

function Row({ item, unanswered = false, startEditing = false }: { item: Item; unanswered?: boolean; startEditing?: boolean }) {
  const [editing, setEditing] = useState(startEditing);
  const [text, setText] = useState(item.answer);
  const [error, setError] = useState("");
  const [busy, start] = useTransition();
  const save = () =>
    start(async () => {
      setError("");
      const r = await answerTraining(item.id, text);
      if (r && "error" in r && r.error) setError(r.error);
      else setEditing(false);
    });
  return (
    <li className="flex flex-col gap-2 rounded-2xl bg-soft p-4">
      <p className="font-semibold leading-snug">
        {item.question}
        {item.fromChat && <span className="ml-2 rounded-full bg-warn-chip px-2 py-0.5 align-middle text-[11px] font-semibold text-warn">From a client chat</span>}
      </p>
      {editing ? (
        <>
          <textarea className="input min-h-20 bg-card py-2.5" value={text} maxLength={1000} onChange={(e) => setText(e.target.value)} aria-label={`Answer: ${item.question}`} autoFocus />
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" disabled={busy || text.trim().length < 2} onClick={save}>{busy ? "Saving…" : "Save"}</button>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => { setText(item.answer); setEditing(false); }}>Cancel</button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className={`min-w-0 flex-1 whitespace-pre-wrap text-sm ${unanswered ? "text-muted" : "text-ink-2"}`}>{unanswered ? "Not answered yet" : item.answer}</p>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setEditing(true)}>{unanswered ? "Answer" : "Edit"}</button>
            {!unanswered && (
              <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => { if (window.confirm("Delete this answer? Your receptionist will stop using it.")) start(() => deleteTraining(item.id)); }}>
                Delete
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function Skipped({ item }: { item: Item }) {
  const [busy, start] = useTransition();
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-1 py-1.5 text-sm text-muted">
      <span>{item.question}</span>
      <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => start(() => reopenTraining(item.id))}>Bring back</button>
    </li>
  );
}

function AddOwn() {
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, start] = useTransition();
  return (
    <section aria-labelledby="own-h" className="card flex flex-col gap-3 p-6">
      <h2 id="own-h" className="font-display text-xl font-semibold">Teach something new</h2>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            setMsg(null);
            const r = await addOwnTraining(q, a);
            if (r && "error" in r && r.error) setMsg({ ok: false, text: r.error });
            else {
              setMsg({ ok: true, text: "Saved. Your receptionist knows this now." });
              setQ("");
              setA("");
            }
          });
        }}
      >
        <label className="flex flex-col gap-1.5 text-[13px] text-muted">
          Question a client might ask
          <input className="input" value={q} maxLength={200} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Do you do bridal trials?" />
        </label>
        <label className="flex flex-col gap-1.5 text-[13px] text-muted">
          Your answer
          <textarea className="input min-h-20 py-2.5" value={a} maxLength={1000} onChange={(e) => setA(e.target.value)} placeholder="e.g. Yes! Trials are $85 and need to be booked at least 2 weeks before the wedding." />
        </label>
        {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.text}</p>}
        <button className="btn btn-primary self-start" disabled={busy || q.trim().length < 4 || a.trim().length < 2}>{busy ? "Saving…" : "Save"}</button>
      </form>
    </section>
  );
}
