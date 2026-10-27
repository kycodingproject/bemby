"use client";

import type { TextingRegistrationValues } from "@/lib/validation";


export const emptyRegistration = (email = ""): TextingRegistrationValues => ({
  legal_name: "", ein: "", street: "", city: "", state: "", zip: "", contact_phone: "", contact_email: email,
});

/** The details US carriers need before a business can text clients. */
export function NumberRequestFields({ value, onChange }: { value: TextingRegistrationValues; onChange: (v: TextingRegistrationValues) => void }) {
  const set = (k: keyof TextingRegistrationValues) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value });
  const field = "flex flex-col gap-1.5 text-[13px] text-muted";
  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-2xl bg-soft p-4 text-[13px] leading-relaxed text-ink-2">
        Phone carriers require every business that texts clients to register. We submit this for you. It isn&apos;t shared with clients.
      </p>
      <div className="flex flex-wrap gap-3">
        <label className={`${field} flex-[2_1_240px]`}>
          Legal business name
          <input className="input" value={value.legal_name} onChange={set("legal_name")} placeholder="Or your full legal name if you're a sole proprietor" autoComplete="organization" />
        </label>
        <label className={`${field} flex-[1_1_160px]`}>
          EIN (optional)
          <input className="input" value={value.ein} onChange={set("ein")} placeholder="12-3456789" inputMode="numeric" />
        </label>
      </div>
      <p className="-mt-1 text-xs text-muted">No EIN? Leave it blank and we&apos;ll register you as a sole proprietor.</p>
      <label className={field}>
        Street address
        <input className="input" value={value.street} onChange={set("street")} autoComplete="street-address" />
      </label>
      <div className="flex flex-wrap gap-3">
        <label className={`${field} flex-[2_1_160px]`}>City<input className="input" value={value.city} onChange={set("city")} autoComplete="address-level2" /></label>
        <label className={`${field} w-24`}>State<input className="input" value={value.state} onChange={set("state")} maxLength={2} placeholder="CA" autoComplete="address-level1" /></label>
        <label className={`${field} w-32`}>ZIP<input className="input" value={value.zip} onChange={set("zip")} inputMode="numeric" autoComplete="postal-code" /></label>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className={`${field} flex-1 basis-48`}>
          Your mobile number
          <input className="input" value={value.contact_phone} onChange={set("contact_phone")} inputMode="tel" autoComplete="tel" placeholder="(310) 555-0123" />
        </label>
        <label className={`${field} flex-1 basis-48`}>
          Email
          <input className="input" type="email" value={value.contact_email} onChange={set("contact_email")} autoComplete="email" />
        </label>
      </div>
      <p className="-mt-1 text-xs text-muted">Sole proprietors get a one-time verification text from the carrier registry at this mobile number.</p>
    </div>
  );
}
