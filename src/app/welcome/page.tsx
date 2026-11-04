import Image from "next/image";
import Link from "next/link";
import { ChatDemo } from "@/components/landing/ChatDemo";
import { Reveal, RotatingWord } from "@/components/landing/Motion";
import { PLANS } from "@/lib/plans";

export const metadata = {
  title: "Bemby · Your DMs, booked",
  description: "An AI receptionist that answers your Instagram, Messenger and text clients, collects inspo pics, offers your open times and books appointments for you to approve.",
};

const BUSINESSES = ["Hairstylists", "Lash artists", "Tattoo artists", "Nail techs", "Estheticians", "Barbers", "Brow artists", "Braiders"];

const STEPS = [
  { n: "01", title: "Connect your DMs", body: "Link Instagram and Messenger in a couple of taps, or get a business number for texting. Add your services, prices and hours." },
  { n: "02", title: "Your receptionist takes the chat", body: "Give it a name. It answers questions, asks for hair or reference photos, and offers only times you're actually free." },
  { n: "03", title: "You tap approve", body: "Every booking lands on your calendar as a request. Approve or decline in one tap and the client hears back right away." },
];

const FEATURES = [
  { icon: "chat", title: "Only answers booking chats", body: "Friends, family and random DMs are left alone. It jumps in when someone asks about booking, prices or your services." },
  { icon: "camera", title: "Reads inspo pics", body: "Asks for current hair, references or nail inspo, and attaches the photos to the booking so you know what you're walking into." },
  { icon: "calendar", title: "A calendar you approve from", body: "See requests inside each day, approve or decline, and open any booking to see notes and photos." },
  { icon: "hand", title: "Take over anytime", body: "Watch every conversation live. Jump in with one tap, or reply from Instagram and it steps back on its own." },
  { icon: "trophy", title: "Goals, streaks & levels", body: "Set a monthly booking goal, earn XP for every booking and keep your streak going." },
  { icon: "spark", title: "Specials that sell", body: "Run a deal and it writes the caption for you, then mentions the special to clients in chat." },
];

function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    chat: "M4 5h16v11H8l-4 4V5z",
    camera: "M4 8h3l2-3h6l2 3h3v11H4V8zm8 9a4 4 0 100-8 4 4 0 000 8z",
    calendar: "M5 6h14v14H5V6zm0 4h14M9 3v4m6-4v4",
    hand: "M8 12V5a1.5 1.5 0 013 0v6m0-1V4a1.5 1.5 0 013 0v7m0-4a1.5 1.5 0 013 0v6a7 7 0 01-7 7h-1a6 6 0 01-5-3l-2-4a1.5 1.5 0 012.5-1.5L8 15",
    trophy: "M8 4h8v5a4 4 0 01-8 0V4zm0 2H5a3 3 0 003 3m8-3h3a3 3 0 01-3 3m-4 4v4m-4 3h8",
    spark: "M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z",
  };
  return (
    <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#8c72ff] to-[#5a3be6] text-white shadow-[0_8px_20px_rgba(106,75,245,0.35),inset_0_1px_0_rgba(255,255,255,0.35)]">
      <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d={paths[name]} />
      </svg>
    </span>
  );
}

export default function Welcome() {
  return (
    <div className="landing-bg relative min-h-dvh overflow-x-hidden">
      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-4 py-5 md:px-8">
        <Link href="/welcome" className="flex items-center gap-2.5" aria-label="Bemby home">
          <Image src="/bemby-logo.png" alt="" width={34} height={35} className="drop-shadow-[0_6px_12px_rgba(106,75,245,0.35)]" priority />
          <span className="font-display text-xl font-bold tracking-tight">bemby</span>
        </Link>
        <nav className="flex items-center gap-2">
          <a href="#pricing" className="hidden px-3 text-sm font-semibold text-ink-2 hover:text-ink sm:inline">Pricing</a>
          <Link href="/login" className="btn btn-ghost">Sign in</Link>
          <Link href="/signup" className="btn btn-primary hidden sm:inline-flex">Get started</Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid max-w-6xl items-center gap-14 px-4 pb-24 pt-8 md:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-14">
        <div className="flex flex-col items-start gap-6">
          <p className="landing-rise inline-flex items-center gap-2 rounded-full bg-white/80 px-3.5 py-1.5 text-[13px] font-semibold text-brand-ink shadow-[0_0_0_1px_rgba(106,75,245,0.18)] backdrop-blur">
            <span className="size-2 rounded-full bg-brand landing-ping" /> Your receptionist for Instagram, Messenger & text
          </p>
          <h1 className="landing-rise font-display text-[44px] font-bold leading-[1.03] tracking-[-0.035em] sm:text-6xl lg:text-[68px] [animation-delay:80ms]">
            Your DMs,{" "}
            <span className="bg-gradient-to-r from-[#6a4bf5] via-[#9a6bff] to-[#e05aa8] bg-clip-text text-transparent">booked.</span>
          </h1>
          <p className="landing-rise max-w-xl text-lg leading-relaxed text-ink-2 [animation-delay:160ms]">
            Bemby answers every &ldquo;how much for a{" "}
            <RotatingWord words={["silk press", "lash fill", "fine line tattoo", "gel set", "fade", "facial", "knotless braids"]} className="font-semibold text-brand-ink" />
            ?&rdquo; while you work. It asks for inspo pics, offers your open times, and sends you every booking to approve.
          </p>
          <div className="landing-rise flex flex-wrap items-center gap-3 [animation-delay:240ms]">
            <Link href="/signup" className="btn btn-primary landing-cta min-h-14 rounded-2xl px-7 text-base">
              Get started for {PLANS.trial.price}
              <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden><path d="M4 10h12m-5-5l5 5-5 5" /></svg>
            </Link>
            <span className="text-sm text-muted">First month, then {PLANS.social.price}/mo. Cancel anytime.</span>
          </div>
          <ul className="landing-rise flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-2 [animation-delay:320ms]">
            {["Set up in about 5 minutes", "You approve every booking", "No phone calls"].map((t) => (
              <li key={t} className="flex items-center gap-1.5">
                <svg viewBox="0 0 20 20" className="size-4 text-ok" fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden><path d="M4 10.5l4 4 8-9" /></svg>
                {t}
              </li>
            ))}
          </ul>
        </div>
        <div className="landing-rise pb-10 [animation-delay:200ms]">
          <ChatDemo />
        </div>
      </section>

      {/* Who it's for */}
      <section aria-label="Built for" className="relative z-10 overflow-hidden border-y border-line bg-white/60 py-5 backdrop-blur">
        <div className="landing-marquee flex w-max gap-10 font-display text-lg font-semibold text-ink-2/70">
          {[...BUSINESSES, ...BUSINESSES].map((b, i) => (
            <span key={i} className="flex items-center gap-10" aria-hidden={i >= BUSINESSES.length}>
              {b} <span className="size-1.5 rounded-full bg-brand/40" />
            </span>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-24 md:px-8">
        <Reveal>
          <p className="label">How it works</p>
          <h2 className="mt-3 max-w-2xl font-display text-4xl font-bold tracking-tight">From &ldquo;hi!&rdquo; to booked, without you picking up your phone.</h2>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 120}>
              <div className="card h-full p-7">
                <p className="bg-gradient-to-br from-[#6a4bf5] to-[#e05aa8] bg-clip-text font-display text-4xl font-bold text-transparent">{s.n}</p>
                <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-24 md:px-8">
        <Reveal>
          <p className="label">What you get</p>
          <h2 className="mt-3 max-w-2xl font-display text-4xl font-bold tracking-tight">A front desk that never sleeps, and never double-books.</h2>
        </Reveal>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 100}>
              <div className="card group h-full p-6 transition-transform duration-300 hover:-translate-y-1">
                <Icon name={f.icon} />
                <h3 className="mt-5 font-display text-[17px] font-semibold">{f.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative z-10 mx-auto max-w-6xl scroll-mt-8 px-4 pb-24 md:px-8">
        <Reveal className="text-center">
          <p className="label">Pricing</p>
          <h2 className="mt-3 font-display text-4xl font-bold tracking-tight">Less than one missed booking a month.</h2>
        </Reveal>
        <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
          {[
            { plan: PLANS.trial, points: ["Instagram & Messenger DMs", "Calendar, inbox & goals", "Becomes Social after month one"], hot: false },
            { plan: PLANS.social, points: ["Instagram & Messenger DMs", "Unlimited conversations", "Specials, goals & streaks"], hot: true },
            { plan: PLANS.pro, points: ["Everything in Social", "Your own business number", "1,000 texts a month"], hot: false },
          ].map(({ plan, points, hot }, i) => (
            <Reveal key={plan.id} delay={i * 120}>
              <div className={`relative flex h-full flex-col rounded-[24px] p-7 ${hot ? "bg-gradient-to-b from-[#6a4bf5] to-[#4a2fd0] text-white shadow-[0_30px_60px_-20px_rgba(70,40,190,0.6)]" : "card"}`}>
                {hot && <span className="absolute -top-3 right-6 rounded-full bg-white px-3 py-1 text-xs font-bold text-brand-ink shadow">Most popular</span>}
                <p className={`font-display text-lg font-semibold ${hot ? "" : "text-ink"}`}>{plan.name}</p>
                <p className="mt-4 flex items-baseline gap-1.5">
                  <span className="font-display text-4xl font-bold tracking-tight">{plan.price}</span>
                  <span className={`text-sm ${hot ? "text-white/75" : "text-muted"}`}>{plan.period}</span>
                </p>
                <ul className={`mt-6 flex flex-1 flex-col gap-2.5 text-[15px] ${hot ? "text-white/90" : "text-ink-2"}`}>
                  {points.map((pt) => (
                    <li key={pt} className="flex gap-2">
                      <svg viewBox="0 0 20 20" className={`mt-0.5 size-4 shrink-0 ${hot ? "text-white" : "text-brand"}`} fill="none" stroke="currentColor" strokeWidth={2.2} aria-hidden><path d="M4 10.5l4 4 8-9" /></svg>
                      {pt}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className={`btn mt-7 min-h-12 ${hot ? "bg-white text-brand-ink hover:bg-white/90" : "btn-primary"}`}>Get started</Link>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Final call to action */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-20 md:px-8">
        <Reveal>
          <div className="landing-final relative overflow-hidden rounded-[32px] px-6 py-16 text-center text-white md:px-16">
            <span aria-hidden className="orb landing-float-slow absolute -right-10 -top-10 size-44 opacity-70" />
            <span aria-hidden className="orb landing-float absolute -bottom-12 -left-8 size-32 opacity-50" />
            <h2 className="relative font-display text-4xl font-bold tracking-tight md:text-5xl">Stop living in your DMs.</h2>
            <p className="relative mx-auto mt-4 max-w-lg text-lg text-white/85">Let your receptionist answer, collect the details and fill your calendar. You just show up and do your thing.</p>
            <Link href="/signup" className="btn landing-cta relative mt-8 min-h-14 rounded-2xl bg-white px-8 text-base text-brand-ink hover:bg-white/90">
              Get started for {PLANS.trial.price}
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="relative z-10 mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-line px-4 py-8 text-sm text-muted md:px-8">
        <p>© {new Date().getFullYear()} Bemby</p>
        <nav aria-label="Legal" className="flex gap-5">
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          <Link href="/terms" className="hover:text-ink">Terms</Link>
          <Link href="/data-deletion" className="hover:text-ink">Data deletion</Link>
        </nav>
      </footer>
    </div>
  );
}
