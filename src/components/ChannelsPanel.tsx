"use client";

import { useState, useTransition } from "react";
import { chooseMessengerPage, disconnectChannel, requestBusinessNumber } from "@/app/(app)/actions";
import { upgradeOrCheckoutPro } from "@/app/(app)/billing/actions";
import { emptyRegistration, NumberRequestFields } from "./NumberRequest";
import { NUMBER_APPROVAL, PLANS } from "@/lib/plans";

export function ChannelsPanel(props: {
  demo: boolean;
  instagram: string | null;
  messenger: string | null;
  pendingPages: { id: string; name: string }[];
  phone: string | null;
  textingStatus: "none" | "requested" | "pending" | "active" | "failed";
  email: string;
  notice: { ok: boolean; text: string } | null;
  billing: boolean;
}) {
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [reg, setReg] = useState(emptyRegistration(props.email));

  const row = "flex flex-wrap items-center justify-between gap-3 border-b border-line py-4 last:border-0";
  const connectLink = (href: string, label: string) =>
    props.demo ? <span className="text-[13px] text-muted">Available on your own account</span> : <a href={href} className="btn btn-primary">{label}</a>;

  const statusText: Record<typeof props.textingStatus, string> = {
    none: "",
    requested: "We're setting up your number. Carrier approval usually takes 2–4 days, and Bemby answers DMs meanwhile.",
    pending: "Waiting on carrier approval, usually 2–4 days. We'll let you know when it's live.",
    active: "Live. Give this number to clients.",
    failed: "Carriers didn't approve the registration. We'll reach out to fix the details.",
  };

  return (
    <section id="channels" aria-labelledby="channels-h" className="card flex flex-col p-6">
      <h2 id="channels-h" className="font-display text-xl font-semibold">Where clients reach you</h2>
      <p className="mt-1 text-sm text-muted">Bemby answers on every channel you connect.</p>
      {props.notice && (
        <p role={props.notice.ok ? "status" : "alert"} className={`mt-3 rounded-2xl px-4 py-3 text-sm ${props.notice.ok ? "bg-ok-soft text-ok" : "bg-warn-soft text-danger"}`}>
          {props.notice.text}
        </p>
      )}
      {err && <p role="alert" className="mt-3 rounded-2xl bg-warn-soft px-4 py-3 text-sm text-danger">{err}</p>}

      <div className={row}>
        <div>
          <p className="text-sm font-semibold">Instagram DMs</p>
          <p className="mt-0.5 text-[13px] text-muted">{props.instagram ? `Connected as @${props.instagram}` : "Needs a Business or Creator account (free to switch in the Instagram app)"}</p>
        </div>
        {props.instagram && props.demo ? (
          <span className="text-[13px] text-ok">Connected</span>
        ) : props.instagram ? (
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => start(() => disconnectChannel("instagram"))}>Disconnect</button>
        ) : (
          connectLink("/api/connect/instagram", "Connect Instagram")
        )}
      </div>

      <div className={row}>
        <div>
          <p className="text-sm font-semibold">Facebook Messenger</p>
          <p className="mt-0.5 text-[13px] text-muted">{props.messenger ? `Connected to ${props.messenger}` : "Needs a Facebook Page for your business"}</p>
        </div>
        {props.messenger ? (
          <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => start(() => disconnectChannel("messenger"))}>Disconnect</button>
        ) : (
          connectLink("/api/connect/messenger", "Connect Messenger")
        )}
        {props.pendingPages.length > 0 && !props.messenger && (
          <div className="flex w-full flex-col gap-2 rounded-2xl bg-soft p-4">
            <p className="text-sm font-semibold">Which Page should Bemby answer for?</p>
            <div className="flex flex-wrap gap-2">
              {props.pendingPages.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="btn btn-ghost bg-card"
                  disabled={busy}
                  onClick={() => start(async () => { const r = await chooseMessengerPage(p.id); setErr(r?.error ?? null); })}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className={row}>
        <div className="min-w-56 flex-1">
          <p className="text-sm font-semibold">Business phone number</p>
          <p className="mt-0.5 text-[13px] text-muted">
            {props.phone ? `${props.phone} · ` : ""}
            {props.textingStatus === "none" ? `A dedicated number clients can text, on ${PLANS.pro.name} (${PLANS.pro.price}/month). ${NUMBER_APPROVAL}.` : statusText[props.textingStatus]}
          </p>
        </div>
        {props.textingStatus === "none" && !showForm && (
          props.demo ? <span className="text-[13px] text-muted">Available on your own account</span> : <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>Get a number (Pro)</button>
        )}
        {showForm && (
          <form
            className="flex w-full flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              setErr(null);
              start(async () => {
                const r = await requestBusinessNumber(reg);
                if (r?.error) return setErr(r.error);
                if (props.billing) {
                  const u = await upgradeOrCheckoutPro();
                  if (u.error) return setErr(u.error);
                  if (u.url) return void (window.location.href = u.url);
                }
                setShowForm(false);
              });
            }}
          >
            <NumberRequestFields value={reg} onChange={setReg} />
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary" disabled={busy}>{busy ? "Sending…" : `Upgrade to Pro & request my number (${PLANS.pro.price}/mo)`}</button>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
