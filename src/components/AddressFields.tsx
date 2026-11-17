"use client";

/** Business address + who gets to see it. Used in onboarding and Settings. */
export function AddressFields(props: {
  address: string;
  note: string;
  isPublic: boolean;
  onChange: (v: { address?: string; note?: string; isPublic?: boolean }) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-2xl bg-soft p-4">
      <legend className="sr-only">Business address</legend>
      <label className="flex flex-col gap-1.5 text-[13px] text-muted">
        Business address
        <input
          className="input bg-card"
          value={props.address}
          maxLength={200}
          autoComplete="street-address"
          onChange={(e) => props.onChange({ address: e.target.value })}
          placeholder="e.g. 1420 Sunset Blvd, Suite 4, Los Angeles, CA 90026"
        />
      </label>
      <label className="flex flex-col gap-1.5 text-[13px] text-muted">
        Directions for clients (optional)
        <input
          className="input bg-card"
          value={props.note}
          maxLength={200}
          onChange={(e) => props.onChange({ note: e.target.value })}
          placeholder="e.g. Free parking behind the building. Ring the buzzer for Suite 4."
        />
      </label>
      <div role="radiogroup" aria-label="Who can see your address" className="flex flex-col gap-2">
        <p className="text-[13px] text-muted">Who can see it?</p>
        {[
          { v: true, t: "Anyone who asks", d: "Your receptionist shares it when asked, and sends it with every confirmed booking." },
          { v: false, t: "Only booked clients", d: "Good for home studios. It's sent only once you approve their appointment." },
        ].map((o) => (
          <button
            key={String(o.v)}
            type="button"
            role="radio"
            aria-checked={props.isPublic === o.v}
            onClick={() => props.onChange({ isPublic: o.v })}
            className={`flex flex-col items-start gap-0.5 rounded-xl p-3 text-left ${props.isPublic === o.v ? "bg-brand-soft shadow-[inset_0_0_0_2px_var(--color-brand)]" : "bg-card shadow-[inset_0_0_0_1px_rgba(26,24,48,0.1)] hover:bg-hover"}`}
          >
            <span className="text-sm font-semibold">{o.t}</span>
            <span className="text-[13px] text-muted">{o.d}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
