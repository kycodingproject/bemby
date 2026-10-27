"use client";

import { useState, useTransition } from "react";
import { addGoal } from "@/app/(app)/actions";

export function GoalAdder() {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [target, setTarget] = useState(10);
  const [pending, start] = useTransition();

  if (!open)
    return (
      <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)}>
        + Add goal
      </button>
    );

  return (
    <form
      className="flex w-full flex-wrap items-end gap-2.5 rounded-2xl bg-soft p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          await addGoal(label, target);
          setLabel("");
          setOpen(false);
        });
      }}
    >
      <label className="flex min-w-48 flex-1 flex-col gap-1.5 text-xs text-muted">
        Goal
        <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Book 10 knotless sets" required />
      </label>
      <label className="flex w-28 flex-col gap-1.5 text-xs text-muted">
        Target
        <input className="input" type="number" min={1} value={target} onChange={(e) => setTarget(Number(e.target.value))} />
      </label>
      <button className="btn btn-primary" disabled={pending}>Save goal</button>
      <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
    </form>
  );
}
