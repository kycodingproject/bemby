import { redirect } from "next/navigation";
import { billingEnabled, hasActivePlan } from "@/lib/billing";
import { PLANS } from "@/lib/plans";
import { currentBusinessId, getRepo, isDemo } from "@/lib/repo";
import { startCheckout } from "./actions";

export const metadata = { title: "Choose your plan · Bemby" };

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ canceled?: string }> }) {
  if (isDemo() || !billingEnabled()) redirect("/");
  const b = (await getRepo().getBusiness(await currentBusinessId()))!;
  if (hasActivePlan(b)) redirect("/settings#plan");
  const { canceled } = await searchParams;
  const firstTime = !b.stripe_subscription_id && (b.subscription_status ?? "none") === "none";
  const wantsNumber = b.texting_status === "requested";

  const plans = [
    {
      id: "trial" as const,
      name: PLANS.social.name,
      price: firstTime ? PLANS.trial.price : PLANS.social.price,
      period: firstTime ? `first month, then ${PLANS.social.price}/month` : "/ month",
      points: ["Bemby answers Instagram & Messenger DMs", "Books appointments for your approval", "Inbox, calendar, goals and specials"],
      highlight: !wantsNumber,
    },
    {
      id: "pro" as const,
      name: PLANS.pro.name,
      price: PLANS.pro.price,
      period: "/ month",
      points: ["Everything in Social", "Your own business phone number", `${PLANS.pro.texts.toLocaleString()} texts a month`, "Carrier approval usually takes 2–4 days"],
      highlight: wantsNumber,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">Turn Bemby on</h1>
        <p className="mt-1.5 text-sm text-muted">Pick a plan to let Bemby start answering your clients. Cancel anytime.</p>
      </header>
      {canceled && <p className="rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">Checkout was canceled. Pick a plan whenever you&apos;re ready.</p>}
      <div className="grid gap-6 md:grid-cols-2">
        {plans.map((p) => (
          <section key={p.id} className={`card flex flex-col gap-4 p-6 ${p.highlight ? "shadow-[inset_0_0_0_2px_var(--color-brand),var(--shadow-card)]" : ""}`}>
            <div>
              <h2 className="font-display text-xl font-semibold">{p.name}</h2>
              <p className="mt-2 flex flex-wrap items-baseline gap-2">
                <span className="font-display text-4xl font-bold">{p.price}</span>
                <span className="text-sm text-muted">{p.period}</span>
              </p>
            </div>
            <ul className="flex flex-col gap-2 text-sm text-ink-2">
              {p.points.map((t) => (
                <li key={t} className="flex gap-2"><span aria-hidden="true" className="text-brand">✓</span>{t}</li>
              ))}
            </ul>
            <form action={startCheckout.bind(null, p.id)} className="mt-auto">
              <button className={`btn w-full ${p.highlight ? "btn-primary" : "btn-ghost"}`}>
                {p.id === "pro" ? `Start Pro, ${PLANS.pro.price}/month` : firstTime ? `Start for ${PLANS.trial.price}` : `Start Social, ${PLANS.social.price}/month`}
              </button>
            </form>
          </section>
        ))}
      </div>
      <p className="text-[13px] text-muted">Payments are handled securely by Stripe. You can switch plans or cancel from Settings.</p>
    </div>
  );
}
