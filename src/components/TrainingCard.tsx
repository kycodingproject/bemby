"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { answerTraining } from "@/app/(app)/actions";
import { useDictation } from "@/hooks/useDictation";

export interface TrainingTask {
  id: string;
  question: string;
  fromChat: boolean;
  conversationId: string | null;
}

/** Home: answer a few questions a day so the receptionist can handle more on its own. */
export function TrainingCard(props: {
  assistant: string;
  tasks: TrainingTask[];
  answeredToday: number;
  daily: number;
  doneForToday: boolean;
  allStartersDone: boolean;
  progress: number; // 0..1 of the starter questions
  answered: number;
  xpPerAnswer: number;
}) {
  const pct = Math.round(props.progress * 100);
  const ready = props.allStartersDone;
  return (
    <section aria-labelledby="train-h" className={`card flex flex-col gap-4 p-6 ${props.tasks.length ? "bg-[#fff6ea] shadow-[inset_0_0_0_2px_rgba(234,128,30,0.55),0_14px_34px_-14px_rgba(234,128,30,0.45)]" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2">
            <span className="label">Daily tasks</span>
            {props.tasks.length > 0 && (
              <span className="flex items-center gap-1.5 rounded-full bg-[#ea801e] px-2.5 py-0.5 text-xs font-bold text-white">
                <span className="landing-ping size-1.5 rounded-full bg-white" aria-hidden />
                {props.tasks.length} to do
              </span>
            )}
          </p>
          <h2 id="train-h" className="mt-1 font-display text-xl font-semibold">Train {props.assistant} for better replies</h2>
          <p className="mt-1 text-sm text-muted">
            Answer what clients often ask. {props.assistant} uses your answers in every chat. +{props.xpPerAnswer} XP each.
          </p>
        </div>
        <Link href="/training" className="btn btn-ghost">See all answers</Link>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap justify-between gap-2 text-[13px]">
          <span className="font-semibold">{ready ? `${props.assistant} is fully trained` : `${pct}% trained`}</span>
          <span className="text-muted">
            {props.answeredToday}/{props.daily} today · {props.answered} answer{props.answered === 1 ? "" : "s"} taught
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-track">
          <div className={`h-2.5 rounded-full transition-[width] duration-700 ${props.tasks.length ? "bg-[#ea801e]" : "bg-brand"}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {props.tasks.length > 0 ? (
        <ol className="flex flex-col gap-3">
          {props.tasks.map((t) => <Task key={t.id} task={t} />)}
        </ol>
      ) : (
        <p className="rounded-2xl bg-ok-soft px-4 py-3.5 text-sm font-semibold text-ok">
          {ready
            ? `All caught up. When ${props.assistant} gets a question it can't answer, it'll show up here for you.`
            : `Nice work! ${props.daily} new questions tomorrow. ${props.assistant} is already using your answers.`}
        </p>
      )}
    </section>
  );
}

function Task({ task }: { task: TrainingTask }) {
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [busy, start] = useTransition();
  const id = `ans-${task.id}`;
  const voice = useDictation((t) => setAnswer((a) => (a.trim() ? `${a.trimEnd()} ${t}` : t)));
  return (
    <li className={`flex flex-col gap-2.5 rounded-2xl bg-card p-4 ${task.fromChat ? "shadow-[inset_0_0_0_2px_rgba(234,128,30,0.6)]" : "shadow-[inset_0_0_0_1px_rgba(234,128,30,0.25)]"}`}>
      {task.fromChat && (
        <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[#b25a06]">
          A client asked this and your receptionist didn&apos;t know
          {task.conversationId && <Link href={`/inbox?c=${task.conversationId}`} className="underline">See chat</Link>}
        </p>
      )}
      <label htmlFor={id} className="font-display text-[15px] font-semibold leading-snug">{task.question}</label>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          voice.stop();
          start(async () => {
            const r = await answerTraining(task.id, answer);
            if (r && "error" in r && r.error) setError(r.error);
          });
        }}
      >
        <textarea
          id={id}
          className="input min-h-20 bg-soft py-2.5 leading-relaxed"
          value={answer + (voice.interim ? (answer ? " " : "") + voice.interim : "")}
          maxLength={1000}
          onChange={(e) => {
            if (voice.listening) voice.stop(); // typing takes over from the microphone
            setAnswer(e.target.value);
          }}
          placeholder="Type or say your answer the way you'd tell a client, e.g. “Yes! Street parking out front, and there's a free lot behind the building.” If it doesn't apply, just say so, like “We don't offer that.”"
        />
        {voice.listening && (
          <p role="status" className="flex items-center gap-2 text-[13px] font-semibold text-[#b25a06]">
            <span className="landing-ping size-2 rounded-full bg-danger" aria-hidden /> Listening… answer like you&apos;re telling a client. Tap Stop when you&apos;re done.
          </p>
        )}
        {(error || voice.error) && <p role="alert" className="text-sm text-danger">{error || voice.error}</p>}
        <div className="flex flex-wrap gap-2">
          <button className="btn bg-[#ea801e] text-white hover:bg-[#d6700f] disabled:opacity-50" disabled={busy || answer.trim().length < 2}>{busy ? "Saving…" : "Save answer"}</button>
          <button
            type="button"
            className={`btn ${voice.listening ? "bg-danger text-white hover:bg-danger/90" : "btn-ghost bg-card"}`}
            disabled={busy}
            onClick={voice.listening ? voice.stop : voice.start}
            aria-pressed={voice.listening}
          >
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
              {voice.listening ? <rect x="7" y="7" width="10" height="10" rx="1.5" /> : <path d="M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zm-7 9a7 7 0 0014 0M12 19v3" />}
            </svg>
            {voice.listening ? "Stop" : "Say it instead"}
          </button>
        </div>
      </form>
    </li>
  );
}
