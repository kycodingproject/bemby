"use client";

import { useState, useTransition } from "react";
import { saveBusinessDetails, saveHours, saveServices } from "@/app/(app)/actions";
import type { ServiceDraft } from "@/lib/templates";
import type { IntakeItem } from "@/lib/types";
import { ServicesEditor } from "./ServicesEditor";
import { HoursEditor, type Hours } from "./HoursEditor";

type Result = { ok?: boolean; error?: string } | undefined;

function useSaver() {
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const save = (fn: () => Promise<Result>) =>
    start(async () => {
      const r = await fn();
      if (r?.error) setMsg({ ok: false, text: r.error });
      else {
        setMsg({ ok: true, text: "Saved. Bemby is using this now." });
        setDirty(false);
      }
    });
  const touch = () => {
    setDirty(true);
    setMsg(null);
  };
  return { busy, msg, dirty, save, touch };
}

function SaveBar({ s, onSave, label = "Save changes" }: { s: ReturnType<typeof useSaver>; onSave: () => void; label?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className="btn btn-primary" disabled={s.busy || !s.dirty} onClick={onSave}>
        {s.busy ? "Saving…" : label}
      </button>
      {s.msg && <p role={s.msg.ok ? "status" : "alert"} className={`text-sm ${s.msg.ok ? "text-ok" : "text-danger"}`}>{s.msg.text}</p>}
      {!s.msg && s.dirty && <p className="text-sm text-muted">Unsaved changes</p>}
    </div>
  );
}

export function ProfileEditor(props: {
  name: string;
  ownerName: string;
  services: ServiceDraft[];
  suggestions: IntakeItem[];
  hours: Hours;
  minNoticeHours: number;
  bufferMinutes: number;
  policies: string;
}) {
  const [name, setName] = useState(props.name);
  const [ownerName, setOwnerName] = useState(props.ownerName);
  const [services, setServices] = useState(props.services);
  const [hours, setHours] = useState(props.hours);
  const [notice, setNotice] = useState(props.minNoticeHours);
  const [buffer, setBuffer] = useState(props.bufferMinutes);
  const [policies, setPolicies] = useState(props.policies);
  const details = useSaver();
  const svc = useSaver();
  const hrs = useSaver();

  return (
    <>
      <section aria-labelledby="details-h" className="card flex flex-col gap-4 p-6">
        <h2 id="details-h" className="font-display text-xl font-semibold">Your business</h2>
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-[2_1_240px] flex-col gap-1.5 text-[13px] text-muted">
            Business name
            <input className="input" value={name} onChange={(e) => { setName(e.target.value); details.touch(); }} />
          </label>
          <label className="flex flex-[1_1_160px] flex-col gap-1.5 text-[13px] text-muted">
            Your first name
            <input className="input" value={ownerName} onChange={(e) => { setOwnerName(e.target.value); details.touch(); }} />
          </label>
        </div>
        <SaveBar s={details} onSave={() => details.save(() => saveBusinessDetails({ name, ownerName }))} />
      </section>

      <section aria-labelledby="services-h" className="card flex flex-col gap-4 p-6">
        <div>
          <h2 id="services-h" className="font-display text-xl font-semibold">Services & prices</h2>
          <p className="mt-1 text-sm text-muted">Bemby quotes these prices and times, and asks for the checked items before booking. Leave a price blank if it varies; Bemby will say you&apos;ll confirm it.</p>
        </div>
        <ServicesEditor services={services} suggestions={props.suggestions} onChange={(s) => { setServices(s); svc.touch(); }} />
        <SaveBar
          s={svc}
          label="Save services"
          onSave={() => {
            if (services.some((s) => !s.name.trim())) return svc.save(async () => ({ error: "Every service needs a name (or remove the empty one)." }));
            svc.save(async () => {
              const r = await saveServices(services.map((s) => ({ ...s, name: s.name.trim() })));
              if (r && "services" in r && r.services) setServices(r.services);
              return r;
            });
          }}
        />
      </section>

      <section aria-labelledby="hours-h" className="card flex flex-col gap-4 p-6">
        <div>
          <h2 id="hours-h" className="font-display text-xl font-semibold">Hours & booking rules</h2>
          <p className="mt-1 text-sm text-muted">Bemby only offers times inside these hours. Appointments already on your calendar stay put.</p>
        </div>
        <HoursEditor hours={hours} onChange={(h) => { setHours(h); hrs.touch(); }} />
        <div className="flex flex-wrap gap-3">
          <label className="flex flex-1 basis-48 flex-col gap-1.5 text-[13px] text-muted">
            How much notice do you need?
            <select className="input" value={notice} onChange={(e) => { setNotice(Number(e.target.value)); hrs.touch(); }}>
              {[0, 2, 12, 24, 48, 72].map((h) => <option key={h} value={h}>{h === 0 ? "None, same-day is fine" : `${h} hours`}</option>)}
            </select>
          </label>
          <label className="flex flex-1 basis-48 flex-col gap-1.5 text-[13px] text-muted">
            Break between clients
            <select className="input" value={buffer} onChange={(e) => { setBuffer(Number(e.target.value)); hrs.touch(); }}>
              {[0, 10, 15, 30, 45, 60].map((m) => <option key={m} value={m}>{m === 0 ? "No break" : `${m} minutes`}</option>)}
            </select>
          </label>
        </div>
        <label className="flex flex-col gap-1.5 text-[13px] text-muted">
          Policies and anything else Bemby should tell clients
          <textarea className="input min-h-28 py-3" value={policies} onChange={(e) => { setPolicies(e.target.value); hrs.touch(); }} placeholder="e.g. Deposits are non-refundable. 24-hour notice to cancel. I send the address after booking." />
        </label>
        <SaveBar
          s={hrs}
          onSave={() =>
            hrs.save(() =>
              saveHours({
                hours: Object.fromEntries(Object.entries(hours).filter(([, w]) => w?.length)),
                minNoticeHours: notice,
                bufferMinutes: buffer,
                policies,
              }),
            )
          }
        />
      </section>
    </>
  );
}
