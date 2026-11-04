"use client";

import { useEffect, useState } from "react";

type Line = { from: "client" | "bemby"; text?: string; photos?: string[] };
interface Script {
  biz: string;
  channel: string;
  lines: Line[];
  card: { service: string; when: string; client: string; price: string };
  tint: [string, string];
}

/** Three sample chats so visitors see their own kind of business. */
const SCRIPTS: Script[] = [
  {
    biz: "Kiara Hair Studio",
    channel: "Instagram",
    tint: ["#b9a6ff", "#ff9ccf"],
    lines: [
      { from: "client", text: "hiii do you have anything friday for a silk press?" },
      { from: "bemby", text: "Hi! This is Mia, Kiara's assistant. Friday I have 10:00 AM or 2:30 PM. Can you send a pic of your hair now + your inspo?" },
      { from: "client", photos: ["Hair now", "Inspo"], text: "2:30 please!" },
      { from: "bemby", text: "Love it! Your 2:30 request is with Kiara. You'll get a message once it's confirmed." },
    ],
    card: { service: "Silk press", when: "Fri · 2:30 PM", client: "Jada M.", price: "$95" },
  },
  {
    biz: "Lashes by Dee",
    channel: "Messenger",
    tint: ["#9fd8ff", "#c7b5ff"],
    lines: [
      { from: "client", text: "how much for a lash fill?" },
      { from: "bemby", text: "Hey! This is Nova, Dee's booking receptionist. A classic fill is $65 and takes about an hour. Want a time this week?" },
      { from: "client", text: "yes saturday morning" },
      { from: "bemby", text: "Saturday I have 9:00 or 11:30 AM. Which works best?" },
      { from: "client", text: "9!!" },
    ],
    card: { service: "Classic lash fill", when: "Sat · 9:00 AM", client: "Brianna T.", price: "$65" },
  },
  {
    biz: "Ink & Iron Tattoo",
    channel: "Text",
    tint: ["#ffc59e", "#b9a6ff"],
    lines: [
      { from: "client", text: "do you do fine line? want a small rose on my wrist" },
      { from: "bemby", text: "Hi! This is Rio, Marco's assistant. Yes! Small fine line pieces start at $120. Can you send a reference pic?" },
      { from: "client", photos: ["Reference"], text: "about 2 inches, left wrist" },
      { from: "bemby", text: "So pretty. Marco has Tue at 4:00 PM or Wed at 1:00 PM. Want one of those?" },
      { from: "client", text: "tuesday!" },
    ],
    card: { service: "Fine line tattoo", when: "Tue · 4:00 PM", client: "Sofia R.", price: "$120+" },
  },
];

type Phase = { shown: number; typing: boolean; card: "none" | "request" | "approved"; leaving: boolean };

export function ChatDemo() {
  const [s, setS] = useState(0);
  const [p, setP] = useState<Phase>({ shown: 0, typing: false, card: "none", leaving: false });
  const [still, setStill] = useState(false);
  const script = SCRIPTS[s];

  useEffect(() => {
    // Respect "reduce motion": show one finished chat instead of animating.
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      timers.push(setTimeout(() => {
        setStill(true);
        setP({ shown: SCRIPTS[0].lines.length, typing: false, card: "approved", leaving: false });
      }, 0));
      return () => timers.forEach(clearTimeout);
    }
    let t = 600;
    const at = (ms: number, f: () => void) => timers.push(setTimeout(f, (t += ms)));
    script.lines.forEach((line, i) => {
      if (line.from === "bemby") {
        at(500, () => setP((x) => ({ ...x, typing: true })));
        at(1500, () => setP((x) => ({ ...x, typing: false, shown: i + 1 })));
      } else {
        at(i === 0 ? 0 : 1300, () => setP((x) => ({ ...x, shown: i + 1 })));
      }
    });
    at(1000, () => setP((x) => ({ ...x, card: "request" })));
    at(1900, () => setP((x) => ({ ...x, card: "approved" })));
    at(2600, () => setP((x) => ({ ...x, leaving: true })));
    at(500, () => {
      setP({ shown: 0, typing: false, card: "none", leaving: false });
      setS((n) => (n + 1) % SCRIPTS.length);
    });
    return () => timers.forEach(clearTimeout);
  }, [s, script]);

  const visible = (still ? SCRIPTS[0] : script).lines.slice(0, p.shown);
  const shownScript = still ? SCRIPTS[0] : script;

  return (
    <div className="relative mx-auto w-full max-w-[380px]" aria-label="Example: Bemby booking a client in the DMs" role="img">
      {/* Floating wins around the phone */}
      <div aria-hidden className="landing-float absolute right-[calc(100%+14px)] top-24 z-10 hidden whitespace-nowrap rounded-2xl bg-white/90 px-3.5 py-2.5 text-xs font-semibold shadow-[0_12px_30px_rgba(60,40,140,0.18)] backdrop-blur xl:block">
        <span className="text-brand-ink">+50 XP</span> <span className="text-muted">· Level 4</span>
      </div>
      <div aria-hidden className="landing-float-slow absolute -right-5 -top-5 z-10 hidden whitespace-nowrap rounded-2xl bg-white/90 px-3.5 py-2.5 text-xs font-semibold shadow-[0_12px_30px_rgba(60,40,140,0.18)] backdrop-blur lg:block">
        🔥 6-day booking streak
      </div>
      <div aria-hidden className="landing-float absolute right-[calc(100%+14px)] bottom-28 z-10 hidden whitespace-nowrap rounded-2xl bg-white/90 px-3.5 py-2.5 text-xs font-semibold shadow-[0_12px_30px_rgba(60,40,140,0.18)] backdrop-blur xl:block [animation-delay:1.2s]">
        💜 3 new bookings today
      </div>

      <div className="landing-phone relative rounded-[40px] bg-gradient-to-b from-white to-[#f4f1ff] p-3 shadow-[0_40px_80px_-20px_rgba(70,40,190,0.45),0_0_0_1px_rgba(106,75,245,0.12)]">
        <div className="overflow-hidden rounded-[30px] bg-white shadow-[inset_0_0_0_1px_rgba(26,24,48,0.06)]">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
            <span className="orb size-9 shrink-0" />
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold">{shownScript.biz}</p>
              <p className="text-[11px] text-muted">{shownScript.channel} · replies in about a minute</p>
            </div>
          </div>

          <ol className={`flex h-[440px] flex-col justify-end gap-2.5 overflow-hidden px-3.5 pt-3 transition-[opacity,padding] duration-500 ${p.card !== "none" ? "pb-28" : "pb-4"} ${p.leaving ? "opacity-0" : "opacity-100"}`}>
            {visible.map((m, i) =>
              m.from === "client" ? (
                <li key={`${s}-${i}`} className="landing-bubble flex max-w-[82%] flex-col gap-1.5 self-start">
                  {m.photos && (
                    <div className="flex gap-1.5">
                      {m.photos.map((label, j) => (
                        <span
                          key={label}
                          className="flex h-20 w-16 items-end rounded-xl p-1.5 text-[9px] font-semibold text-white shadow-sm"
                          style={{ background: `linear-gradient(${140 + j * 60}deg, ${shownScript.tint[0]}, ${shownScript.tint[1]})` }}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                  {m.text && <p className="rounded-[18px] rounded-bl-md bg-[#f0eff5] px-3.5 py-2.5 text-[13px] leading-snug">{m.text}</p>}
                </li>
              ) : (
                <li key={`${s}-${i}`} className="landing-bubble max-w-[82%] self-end rounded-[18px] rounded-br-md bg-brand px-3.5 py-2.5 text-[13px] leading-snug text-white shadow-[0_6px_16px_rgba(106,75,245,0.3)]">
                  {m.text}
                </li>
              ),
            )}
            {p.typing && (
              <li className="landing-bubble flex gap-1 self-end rounded-[18px] rounded-br-md bg-brand-soft px-4 py-3.5" aria-label="typing">
                {[0, 1, 2].map((d) => (
                  <span key={d} className="landing-dot size-1.5 rounded-full bg-brand" style={{ animationDelay: `${d * 0.15}s` }} />
                ))}
              </li>
            )}
          </ol>
        </div>

        {/* The owner's side: the request lands for approval */}
        {p.card !== "none" && (
          <div className={`landing-card absolute inset-x-6 -bottom-10 rounded-2xl bg-white p-3.5 shadow-[0_20px_44px_rgba(60,40,140,0.28)] transition-opacity duration-500 ${p.leaving ? "opacity-0" : ""}`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-ink">{p.card === "approved" ? "Booked" : "New booking request"}</p>
              <p className="text-[11px] text-muted">{shownScript.card.price}</p>
            </div>
            <p className="mt-1 font-display text-sm font-semibold">{shownScript.card.service} · {shownScript.card.when}</p>
            <p className="text-xs text-muted">{shownScript.card.client}</p>
            <div className="mt-2.5 flex gap-2">
              {p.card === "approved" ? (
                <span className="landing-bubble flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-xl bg-ok-soft text-xs font-semibold text-ok">✓ Approved, client notified</span>
              ) : (
                <>
                  <span className="flex min-h-9 flex-1 items-center justify-center rounded-xl bg-brand text-xs font-semibold text-white landing-press">Approve</span>
                  <span className="flex min-h-9 flex-1 items-center justify-center rounded-xl bg-soft text-xs font-semibold text-ink-2">Decline</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
