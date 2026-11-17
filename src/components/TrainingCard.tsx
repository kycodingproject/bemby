"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { answerTraining, skipTraining } from "@/app/(app)/actions";

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
    <section aria-labelledby="train-h" className="card flex flex-col gap-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label">Daily tasks</p>
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
          <div className="h-2.5 rounded-full bg-brand transition-[width] duration-700" style={{ width: `${pct}%` }} />
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
  return (
    <li className={`flex flex-col gap-2.5 rounded-2xl p-4 ${task.fromChat ? "bg-warn-soft shadow-[inset_0_0_0_1px_rgba(163,87,10,0.25)]" : "bg-soft"}`}>
      {task.fromChat && (
        <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-warn">
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
          start(async () => {
            const r = await answerTraining(task.id, answer);
            if (r && "error" in r && r.error) setError(r.error);
          });
        }}
      >
        <textarea
          id={id}
          className="input min-h-20 bg-card py-2.5 leading-relaxed"
          value={answer}
          maxLength={1000}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Answer the way you'd tell a client, e.g. “Yes! Street parking out front, and there's a free lot behind the building.”"
        />
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" disabled={busy || answer.trim().length < 2}>{busy ? "Saving…" : "Save answer"}</button>
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => start(() => skipTraining(task.id))}>Doesn&apos;t apply to me</button>
        </div>
      </form>
    </li>
  );
}
