"use client";

import type { Business, DayKey } from "@/lib/types";

const DAYS: { key: DayKey; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

export type Hours = Business["hours"];

export function HoursEditor({ hours, onChange }: { hours: Hours; onChange: (h: Hours) => void }) {
  const set = (day: DayKey, w: { start: string; end: string }[]) => onChange({ ...hours, [day]: w });
  return (
    <div className="flex flex-col divide-y divide-line rounded-[18px] bg-soft px-4">
      {DAYS.map((d) => {
        const w = hours[d.key]?.[0];
        return (
          <div key={d.key} className="flex min-h-14 flex-wrap items-center gap-3 py-2">
            <label className="flex w-36 cursor-pointer items-center gap-3 text-sm font-medium">
              <input type="checkbox" className="size-5 accent-brand" checked={!!w} onChange={(e) => set(d.key, e.target.checked ? [{ start: "09:00", end: "18:00" }] : [])} />
              {d.label}
            </label>
            {w ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <label><span className="sr-only">{d.label} opens</span><input type="time" className="input w-32 bg-card" value={w.start} onChange={(e) => set(d.key, [{ ...w, start: e.target.value }])} /></label>
                to
                <label><span className="sr-only">{d.label} closes</span><input type="time" className="input w-32 bg-card" value={w.end} onChange={(e) => set(d.key, [{ ...w, end: e.target.value }])} /></label>
              </div>
            ) : (
              <span className="text-sm text-muted">Closed</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
