"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { createBusiness } from "@/app/onboarding/actions";
import { BUSINESS_TYPES, servicesFor, type ServiceDraft } from "@/lib/templates";
import type { Autonomy } from "@/lib/types";
import { ServicesEditor } from "./ServicesEditor";
import { HoursEditor, type Hours } from "./HoursEditor";

const MODES: { id: Autonomy; title: string; desc: string }[] = [
  { id: "situational", title: "Depends on the situation (recommended)", desc: "Routine questions on autopilot. Reschedules, discounts and anything off-menu come to you first." },
  { id: "auto", title: "Reply on its own", desc: "Bemby answers and books. You just approve appointments." },
  { id: "approve_all", title: "Ask me first", desc: "Bemby drafts every reply. Nothing sends until you tap OK." },
];

const DEFAULT_HOURS: Hours = Object.fromEntries((["tue", "wed", "thu", "fri", "sat"] as const).map((d) => [d, [{ start: "09:00", end: "18:00" }]]));
const STEPS = ["Your business", "Services", "Hours", "Bemby's style"];

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [type, setType] = useState("hair");
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [services, setServices] = useState<ServiceDraft[]>(servicesFor("hair"));
  const [touchedServices, setTouchedServices] = useState(false);
  const [hours, setHours] = useState<Hours>(DEFAULT_HOURS);
  const [notice, setNotice] = useState(12);
  const [buffer, setBuffer] = useState(15);
  const [policies, setPolicies] = useState("");
  const [autonomy, setAutonomy] = useState<Autonomy>("situational");
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();
  const t = BUSINESS_TYPES.find((x) => x.id === type)!;

  function next() {
    setError(null);
    if (step === 0 && (!businessName.trim() || !ownerName.trim())) return setError("Add your business name and first name.");
    if (step === 1) {
      if (services.some((s) => !s.name.trim())) return setError("Every service needs a name (or remove the empty one).");
    }
    if (step === 2 && !Object.values(hours).some((w) => w?.length)) return setError("Pick at least one day you're open.");
    if (step < STEPS.length - 1) return setStep(step + 1);
    start(async () => {
      const res = await createBusiness({
        businessType: type, businessName, ownerName,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        services: services.map((s) => ({ ...s, name: s.name.trim() })),
        hours: Object.fromEntries(Object.entries(hours).filter(([, w]) => w?.length)) as Record<string, { start: string; end: string }[]>,
        minNoticeHours: notice, bufferMinutes: buffer, policies, autonomy,
      });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <main className="flex min-h-dvh flex-col items-center gap-7 px-4 py-10">
      <div className="flex items-center gap-2.5">
        <Image src="/bemby-logo.png" alt="" width={30} height={31} priority />
        <span className="font-display text-xl font-bold tracking-tight">bemby</span>
      </div>
      <ol className="flex w-full max-w-3xl gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 flex-col gap-1.5" aria-current={i === step ? "step" : undefined}>
            <span className={`h-1.5 rounded-full ${i <= step ? "bg-brand" : "bg-track"}`} />
            <span className={`hidden text-xs sm:block ${i === step ? "font-semibold text-ink" : "text-muted"}`}>{s}</span>
          </li>
        ))}
      </ol>

      <section className="card flex w-full max-w-3xl flex-col gap-6 p-6 md:p-9">
        <div>
          <p className="text-[13px] text-brand-ink">Step {step + 1} of {STEPS.length}</p>
          <h1 className="mt-1.5 font-display text-[28px] font-bold leading-tight tracking-tight">
            {["Tell Bemby about your business", "What do you offer?", "When can clients book?", "How hands-on do you want to be?"][step]}
          </h1>
          <p className="mt-2 text-[15px] text-muted">
            {[
              "Bemby uses this to answer clients the way you would.",
              `We started you with common ${t.label.toLowerCase()} services. Set your prices and pick what Bemby asks for before booking.`,
              "Bemby only offers times inside these hours, and never double-books.",
              "You can change this anytime in Settings.",
            ][step]}
          </p>
        </div>

        {step === 0 && (
          <div className="flex flex-col gap-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Business type">
              {BUSINESS_TYPES.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  role="radio"
                  aria-checked={b.id === type}
                  onClick={() => {
                    setType(b.id);
                    if (!touchedServices) setServices(servicesFor(b.id));
                  }}
                  className={`min-h-20 rounded-[18px] p-4 text-left font-display text-[15px] font-semibold ${b.id === type ? "bg-brand-soft shadow-[inset_0_0_0_2px_var(--color-brand)]" : "bg-soft shadow-[inset_0_0_0_1px_rgba(26,24,48,0.08)] hover:bg-hover"}`}
                >
                  {b.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-[2_1_240px] flex-col gap-1.5 text-[13px] text-muted">
                Business name
                <input className="input" value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Kiara Hair Studio" />
              </label>
              <label className="flex flex-[1_1_160px] flex-col gap-1.5 text-[13px] text-muted">
                Your first name
                <input className="input" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Clients will hear this" />
              </label>
            </div>
          </div>
        )}

        {step === 1 && (
          <ServicesEditor
            services={services}
            suggestions={t.asks}
            onChange={(s) => {
              setServices(s);
              setTouchedServices(true);
            }}
          />
        )}

        {step === 2 && (
          <div className="flex flex-col gap-5">
            <HoursEditor hours={hours} onChange={setHours} />
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-1 basis-48 flex-col gap-1.5 text-[13px] text-muted">
                How much notice do you need?
                <select className="input" value={notice} onChange={(e) => setNotice(Number(e.target.value))}>
                  {[0, 2, 12, 24, 48, 72].map((h) => <option key={h} value={h}>{h === 0 ? "None, same-day is fine" : `${h} hours`}</option>)}
                </select>
              </label>
              <label className="flex flex-1 basis-48 flex-col gap-1.5 text-[13px] text-muted">
                Break between clients
                <select className="input" value={buffer} onChange={(e) => setBuffer(Number(e.target.value))}>
                  {[0, 10, 15, 30, 45, 60].map((m) => <option key={m} value={m}>{m === 0 ? "No break" : `${m} minutes`}</option>)}
                </select>
              </label>
            </div>
            <label className="flex flex-col gap-1.5 text-[13px] text-muted">
              Anything else Bemby should tell clients? (optional)
              <textarea
                className="input min-h-28 py-3"
                value={policies}
                onChange={(e) => setPolicies(e.target.value)}
                placeholder="e.g. Deposits are non-refundable. 24-hour notice to cancel. Studio is in Inglewood; I send the address after booking. Come with hair detangled."
              />
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-3" role="radiogroup" aria-label="Reply mode">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={m.id === autonomy}
                onClick={() => setAutonomy(m.id)}
                className={`flex flex-col gap-1.5 rounded-[18px] p-4 text-left ${m.id === autonomy ? "bg-brand-soft shadow-[inset_0_0_0_2px_var(--color-brand)]" : "bg-soft shadow-[inset_0_0_0_1px_rgba(26,24,48,0.08)] hover:bg-hover"}`}
              >
                <span className="font-display text-[15px] font-semibold">{m.title}</span>
                <span className="text-sm text-muted">{m.desc}</span>
              </button>
            ))}
            <p className="mt-2 rounded-2xl bg-soft p-4 text-sm leading-relaxed text-ink-2">
              Either way, Bemby never confirms an appointment on its own. Every booking lands on your calendar for you to approve.
            </p>
          </div>
        )}

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex flex-wrap items-center gap-3">
          {step > 0 && <button type="button" className="btn btn-ghost" onClick={() => { setError(null); setStep(step - 1); }}>Back</button>}
          <span className="flex-1" />
          <button type="button" className="btn btn-primary" disabled={busy} onClick={next}>
            {step === STEPS.length - 1 ? (busy ? "Setting up…" : "Finish setup") : "Continue"}
          </button>
        </div>
      </section>
    </main>
  );
}
