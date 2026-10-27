import Link from "next/link";
import { currentBusinessId, getRepo, isDemo } from "@/lib/repo";
import { homeData } from "@/lib/queries";
import { GoalAdder } from "@/components/GoalAdder";

const BADGE_COLORS = ["#6a4bf5", "#0b7f65", "#a3570a", "#c2185b"];

export default async function HomePage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const d = await homeData(getRepo(), await currentBusinessId());
  const welcome = (await searchParams).welcome === "1";
  const r = 70;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, d.bookedThisMonth / d.monthGoal);
  const toGo = Math.max(0, d.monthGoal - d.bookedThisMonth);
  const today = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: d.business.timezone }).format(new Date());
  const channelLine = [
    d.byChannel.instagram && `${d.byChannel.instagram} on Instagram`,
    d.byChannel.sms && `${d.byChannel.sms} by text`,
    d.byChannel.messenger && `${d.byChannel.messenger} on Messenger`,
  ].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{today}</p>
          <h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight">Hey, {d.business.owner_name}</h1>
        </div>
        <div className="flex items-center gap-2.5 rounded-full border border-line bg-card py-2 pl-2 pr-4 text-sm">
          <span className="flex size-[30px] items-center justify-center rounded-full bg-brand-chip font-display text-[13px] font-bold text-brand-chip-ink">{d.level}</span>
          <span className="font-semibold">{d.levelName}</span>
          {d.streak > 0 && <span className="text-warn">{d.streak}-day streak</span>}
        </div>
      </header>

      {(welcome || (!isDemo() && !d.business.instagram_account_id && !d.business.messenger_page_id)) && (
        <section className="card flex flex-col gap-4 border-brand/30 bg-brand-soft p-5">
          <div className="flex items-start gap-4">
            <div className="orb size-10 shrink-0" />
            <div className="min-w-56 flex-1">
              <p className="font-display text-lg font-semibold">
                {welcome ? `You're all set up, ${d.business.owner_name}!` : "Connect your DMs so Bemby can start booking"}
              </p>
              <p className="mt-1 text-sm text-ink-2">
                Connect Instagram and Messenger and Bemby starts answering DMs right away. You can also practice in your Inbox first.
                {d.business.texting_status === "requested" && " Your business phone number request is in. Carrier approval usually takes 2–4 days once billing is on."}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Link href="/settings#channels" className="btn btn-primary">Connect Instagram & Messenger</Link>
            <Link href="/inbox" className="btn btn-ghost bg-card">Practice in Inbox</Link>
          </div>
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card flex flex-wrap items-center gap-6 p-6">
          <div className="relative size-[168px] shrink-0">
            <svg width="168" height="168" viewBox="0 0 168 168" aria-hidden="true">
              <circle cx="84" cy="84" r={r} fill="none" stroke="var(--color-track)" strokeWidth="14" />
              <circle cx="84" cy="84" r={r} fill="none" stroke="var(--color-brand)" strokeWidth="14" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} transform="rotate(-90 84 84)" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-[44px] font-bold tracking-tight">{d.bookedThisMonth}</span>
              <span className="text-xs text-muted">of {d.monthGoal} booked</span>
            </div>
          </div>
          <div className="flex min-w-40 flex-1 flex-col gap-2.5">
            <p className="label">Booked by Bemby · {d.monthLabel}</p>
            <p className="font-display text-[22px] font-semibold leading-tight">{toGo === 0 ? "Goal reached!" : `${toGo} more to hit your goal`}</p>
            <p className="text-sm leading-relaxed text-muted">Every booking Bemby lands and you approve counts here.</p>
          </div>
        </section>

        <section className="card flex flex-col gap-4 p-6">
          <div className="flex items-center gap-4">
            <div className="orb size-14 shrink-0" />
            <div>
              <p className="font-display text-lg font-semibold">
                {d.business.paused ? "Bemby is paused" : `Bemby is chatting with ${d.activeChats} client${d.activeChats === 1 ? "" : "s"}`}
              </p>
              {channelLine && <p className="mt-1 text-sm text-muted">{channelLine}</p>}
            </div>
          </div>
          {d.pending > 0 && (
            <Link href="/calendar?pending=1" className="flex min-h-[52px] items-center justify-between rounded-2xl bg-warn-soft px-4 text-sm font-semibold text-warn shadow-[inset_0_0_0_1px_rgba(163,87,10,0.25)]">
              {d.pending} appointment{d.pending === 1 ? "" : "s"} need{d.pending === 1 ? "s" : ""} your OK <span aria-hidden="true">→</span>
            </Link>
          )}
          {d.needsYou > 0 && (
            <Link href="/inbox" className="flex min-h-[52px] items-center justify-between rounded-2xl bg-warn-soft px-4 text-sm font-semibold text-warn">
              {d.needsYou} chat{d.needsYou === 1 ? "" : "s"} waiting on you <span aria-hidden="true">→</span>
            </Link>
          )}
          <Link href="/inbox" className="flex min-h-[52px] items-center justify-between rounded-2xl bg-brand-soft px-4 text-sm font-semibold text-brand-ink">
            Watch conversations live <span aria-hidden="true">→</span>
          </Link>
        </section>
      </div>

      <section className="card flex flex-col gap-3 px-6 py-5">
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <span className="font-semibold">Level {d.level} · {d.levelName}</span>
          <span className="text-muted">{d.xpIntoLevel} / {d.xpPerLevel} XP · every booking = +20 XP</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-track">
          <div className="h-3 rounded-full bg-ok" style={{ width: `${(d.xpIntoLevel / d.xpPerLevel) * 100}%` }} />
        </div>
        <ul className="mt-1.5 flex flex-wrap gap-2.5">
          {d.badges.map((b, i) => (
            <li key={b.label} className={`flex items-center gap-2.5 rounded-full border border-line bg-soft py-2 pl-2 pr-3.5 text-[13px] ${b.earned ? "" : "opacity-60"}`}>
              <span
                className="size-7 rounded-full shadow-[inset_0_-3px_6px_rgba(0,0,0,0.25),inset_0_2px_3px_rgba(255,255,255,0.5)]"
                style={{ background: b.earned ? BADGE_COLORS[i % 4] : "var(--color-track)" }}
              />
              {b.label}
              {!b.earned && <span className="sr-only">(locked)</span>}
            </li>
          ))}
        </ul>
      </section>

      <section className="card flex flex-col gap-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">Your goals</h2>
          <GoalAdder />
        </div>
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {d.goals.map((g) => (
            <div key={g.id} className="flex flex-col gap-3 rounded-[18px] border border-line bg-soft p-4">
              <div className="flex justify-between gap-2.5 text-sm">
                <span className="font-semibold">{g.label}</span>
                <span className="shrink-0 text-muted">{g.progress}/{g.target}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-track">
                <div className="h-2 rounded-full bg-brand" style={{ width: `${Math.min(100, (g.progress / g.target) * 100)}%` }} />
              </div>
              <p className="text-xs text-muted">+{g.reward_xp} XP when you hit it</p>
            </div>
          ))}
          {d.goals.length === 0 && <p className="text-sm text-muted">No goals yet. Add one to start tracking.</p>}
        </div>
      </section>
    </div>
  );
}
