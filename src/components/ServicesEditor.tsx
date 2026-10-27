"use client";

import { useState } from "react";
import { DURATIONS, durationLabel, type ServiceDraft } from "@/lib/templates";
import type { IntakeItem } from "@/lib/types";

/** Edit a list of services: name, price, length, deposit, and what Bemby collects before booking. */
export function ServicesEditor(props: { services: ServiceDraft[]; suggestions: IntakeItem[]; onChange: (s: ServiceDraft[]) => void }) {
  const { services, suggestions, onChange } = props;
  const update = (i: number, patch: Partial<ServiceDraft>) => onChange(services.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  return (
    <div className="flex flex-col gap-3">
      {services.map((s, i) => (
        <ServiceRow
          key={i}
          index={i}
          service={s}
          suggestions={suggestions}
          onChange={(p) => update(i, p)}
          onRemove={services.length > 1 ? () => onChange(services.filter((_, j) => j !== i)) : undefined}
        />
      ))}
      <button
        type="button"
        className="btn btn-ghost self-start"
        onClick={() => onChange([...services, { name: "", price: "", minutes: 60, deposit: "", intake: [] }])}
      >
        + Add a service
      </button>
    </div>
  );
}

function ServiceRow(props: { index: number; service: ServiceDraft; suggestions: IntakeItem[]; onChange: (p: Partial<ServiceDraft>) => void; onRemove?: () => void }) {
  const { service: s, onChange } = props;
  const [custom, setCustom] = useState("");
  const options = [...props.suggestions, ...s.intake.filter((x) => !props.suggestions.some((y) => y.key === x.key))];
  const has = (key: string) => s.intake.some((x) => x.key === key);
  const toggle = (item: IntakeItem) => onChange({ intake: has(item.key) ? s.intake.filter((x) => x.key !== item.key) : [...s.intake, item] });
  const n = props.index + 1;

  return (
    <fieldset className="flex flex-col gap-3 rounded-[18px] bg-soft p-4">
      <legend className="sr-only">Service {n}</legend>
      <div className="flex flex-wrap gap-2.5">
        <label className="flex min-w-44 flex-[2_1_200px] flex-col gap-1.5 text-xs text-muted">
          Service
          <input className="input bg-card" value={s.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="e.g. Silk press" />
        </label>
        <label className="flex flex-[1_1_90px] flex-col gap-1.5 text-xs text-muted">
          Price ($)
          <input className="input bg-card" inputMode="decimal" value={s.price} onChange={(e) => onChange({ price: e.target.value.replace(/[^\d.]/g, "") })} placeholder="Set price" />
        </label>
        <label className="flex flex-[1_1_120px] flex-col gap-1.5 text-xs text-muted">
          Time
          <select className="input bg-card" value={s.minutes} onChange={(e) => onChange({ minutes: Number(e.target.value) })}>
            {(DURATIONS.includes(s.minutes) ? DURATIONS : [...DURATIONS, s.minutes].sort((a, b) => a - b)).map((m) => <option key={m} value={m}>{durationLabel(m)}</option>)}
          </select>
        </label>
        <label className="flex flex-[1_1_90px] flex-col gap-1.5 text-xs text-muted">
          Deposit ($)
          <input className="input bg-card" inputMode="decimal" value={s.deposit} onChange={(e) => onChange({ deposit: e.target.value.replace(/[^\d.]/g, "") })} placeholder="None" />
        </label>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted">Before booking, Bemby asks for:</span>
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              aria-pressed={has(o.key)}
              onClick={() => toggle(o)}
              className={`min-h-9 rounded-full px-3 text-[13px] ${has(o.key) ? "bg-brand-chip text-brand-chip-ink shadow-[inset_0_0_0_1px_rgba(106,75,245,0.5)]" : "bg-card text-ink-2 shadow-[inset_0_0_0_1px_rgba(26,24,48,0.1)]"}`}
            >
              {has(o.key) ? "✓ " : "+ "}{o.label}{o.type === "photo" ? " (photo)" : ""}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="min-w-48 flex-1">
            <span className="sr-only">Add your own question for service {n}</span>
            <input className="input bg-card" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Add your own, e.g. Any allergies?" />
          </label>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={!custom.trim()}
            onClick={() => {
              const label = custom.trim().slice(0, 120);
              const key = "custom_" + label.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 30);
              if (!has(key)) onChange({ intake: [...s.intake, { key, label, type: /photo|pic|picture/i.test(label) ? "photo" : "text" }] });
              setCustom("");
            }}
          >
            Add
          </button>
        </div>
      </div>
      {props.onRemove && (
        <button type="button" onClick={props.onRemove} className="self-start text-[13px] text-muted underline hover:text-danger">
          Remove this service
        </button>
      )}
    </fieldset>
  );
}
