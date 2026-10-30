"use client";

import { useState, useTransition } from "react";
import type { Conversation, MediaRef, Message } from "@/lib/types";
import { approveMessage, discardMessage, letBembyAnswer, sendOwnerMessage, setConversationMode } from "@/app/(app)/actions";
import { QUIET_NOTE } from "@/lib/triggers";
import { PhotoTile } from "./PhotoTile";

type Msg = Omit<Message, "media"> & { media: (MediaRef & { url?: string | null })[] };

export function Thread(props: { conversation: Conversation; clientName: string; channelLabel: string; ownerName: string; messages: Msg[] }) {
  const { conversation: cv, messages } = props;
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [busy, start] = useTransition();
  const ownerMode = cv.mode === "owner";
  const visible = messages.filter((m) => m.status !== "discarded");
  // Bemby is holding back because no booking words came up yet.
  const lastQuiet = visible.findLastIndex((m) => m.author === "system" && m.body.startsWith(QUIET_NOTE));
  const quiet = cv.mode === "ai" && lastQuiet >= 0 && !visible.slice(lastQuiet).some((m) => m.author === "ai" || (m.author === "system" && m.body.startsWith("Bemby is back")));
  const [quietError, setQuietError] = useState("");

  return (
    <section aria-label={`Conversation with ${props.clientName}`} className="card flex min-w-0 flex-[999_1_420px] flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <p className="font-display text-lg font-semibold">{props.clientName}</p>
          <p className="mt-0.5 text-[13px] text-muted">{props.channelLabel}{cv.topic ? ` · ${cv.topic}` : ""}</p>
        </div>
        {ownerMode ? (
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => start(() => setConversationMode(cv.id, "ai"))}>
            Hand back to Bemby
          </button>
        ) : (
          <button type="button" className="btn btn-warn" disabled={busy} onClick={() => start(() => setConversationMode(cv.id, "owner"))}>
            Take over
          </button>
        )}
      </div>

      {quiet && (
        <div className="mx-5 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-soft px-4 py-3 text-sm text-ink-2">
          <span>Bemby hasn&apos;t replied because this doesn&apos;t look like a booking chat yet. It will jump in if they ask about booking.</span>
          <button
            type="button"
            className="btn btn-primary"
            disabled={busy}
            onClick={() =>
              start(async () => {
                setQuietError("");
                const r = await letBembyAnswer(cv.id);
                if (r && "error" in r && r.error) setQuietError(r.error);
              })
            }
          >
            {busy ? "Bemby is replying…" : "Let Bemby answer"}
          </button>
          {quietError && <p role="alert" className="w-full text-danger">{quietError}</p>}
        </div>
      )}

      {cv.mode === "needs_owner" && (
        <div className="mx-5 mt-4 rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">
          Bemby handed this chat to you and stopped replying. Take over to answer, or hand it back to Bemby.
        </div>
      )}

      <ol className="flex min-h-[420px] flex-col gap-3 p-5" aria-live="polite">
        {visible.map((m) => {
          if (m.author === "system")
            return <li key={m.id} className="self-center rounded-full bg-soft px-3 py-1.5 text-xs text-muted">{m.body}</li>;
          if (m.author === "client")
            return (
              <li key={m.id} className="flex max-w-[78%] flex-col gap-2 self-start">
                {m.media.length > 0 && <div className="flex gap-2.5">{m.media.map((x, i) => <PhotoTile key={i} media={x} />)}</div>}
                {m.body && <p className="rounded-[18px] rounded-bl-md bg-[#f0eff5] px-4 py-3 text-sm leading-relaxed">{m.body}</p>}
              </li>
            );
          const isAi = m.author === "ai";
          const pending = m.status === "pending_approval";
          const failed = m.status === "failed";
          return (
            <li key={m.id} className="flex max-w-[78%] flex-col items-end gap-1 self-end">
              <span className={`flex items-center gap-1.5 text-[11px] ${isAi ? "text-brand-ink" : "text-warn"}`}>
                {isAi && <span className="orb inline-block size-3" />}
                {isAi ? "Bemby" : "You"}
                {pending && <span className="text-warn">· waiting for your OK ({m.approval_reason})</span>}
                {failed && <span className="text-danger">· not sent: {m.approval_reason}</span>}
              </span>
              {editing?.id === m.id ? (
                <textarea
                  className="input min-h-24 w-[min(420px,70vw)] py-3"
                  value={editing.text}
                  onChange={(e) => setEditing({ id: m.id, text: e.target.value })}
                  aria-label="Edit Bemby's reply"
                />
              ) : (
                <p
                  className={`rounded-[18px] rounded-br-md px-4 py-3 text-sm leading-relaxed ${
                    pending ? "border border-dashed border-warn bg-warn-soft" : isAi ? "bg-brand-chip" : "bg-brand text-white"
                  }`}
                >
                  {m.body}
                </p>
              )}
              {pending && (
                <div className="mt-1 flex flex-wrap justify-end gap-2">
                  <button type="button" className="btn btn-primary" disabled={busy} onClick={() => start(async () => { await approveMessage(m.id, editing?.id === m.id ? editing.text : undefined); setEditing(null); })}>
                    {editing?.id === m.id ? "Send edited" : "Approve & send"}
                  </button>
                  {editing?.id !== m.id && (
                    <button type="button" className="btn btn-ghost" onClick={() => setEditing({ id: m.id, text: m.body })}>Edit</button>
                  )}
                  <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => start(() => discardMessage(m.id))}>Discard</button>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="border-t border-line px-5 pb-5 pt-4">
        {ownerMode ? (
          <form
            className="flex gap-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              const text = draft;
              setDraft("");
              start(() => sendOwnerMessage(cv.id, text));
            }}
          >
            <label className="flex-1">
              <span className="sr-only">Message</span>
              <input className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Reply as ${props.ownerName}…`} />
            </label>
            <button className="btn btn-primary" disabled={busy || !draft.trim()}>Send</button>
          </form>
        ) : (
          <p className="flex items-center gap-3 text-sm text-muted">
            <span className="orb size-[22px] shrink-0" />
            {cv.mode === "needs_owner" ? "Bemby is waiting for you in this chat." : "Bemby is replying for you. Tap Take over to jump in. Bemby pauses until you hand it back."}
          </p>
        )}
      </div>
    </section>
  );
}
