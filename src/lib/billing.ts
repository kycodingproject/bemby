import "server-only";
import Stripe from "stripe";
import { serviceRoleClient } from "./repo/supabase";
import type { Business } from "./types";

/**
 * Bemby plans in Stripe. Products, prices and the trial coupon are created automatically
 * the first time they're needed, so the only Stripe setup is the secret key and webhook.
 */
const CATALOG = {
  social: { lookup: "bemby_social_monthly", product: "Bemby Social", cents: 1999 },
  pro: { lookup: "bemby_pro_monthly", product: "Bemby Pro", cents: 3999 },
} as const;
const TRIAL_COUPON = "bemby_first_month_499"; // $15 off the first $19.99 month = $4.99
const ACTIVE = ["active", "trialing", "past_due"];

export const billingEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY?.trim());

let _stripe: Stripe | null = null;
export function stripe() {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY?.trim();
    if (!key) throw new Error("Stripe isn't set up yet (STRIPE_SECRET_KEY).");
    _stripe = new Stripe(key);
  }
  return _stripe;
}

/** Bemby replies on real channels only while the plan is paid up (or in the practice chat / sample studio). */
export function hasActivePlan(b: Pick<Business, "subscription_status">) {
  if (!billingEnabled()) return true; // before Stripe is connected, nothing is gated
  return ACTIVE.includes(b.subscription_status ?? "none");
}

let catalog: Promise<{ social: string; pro: string; coupon: string }> | null = null;
export function ensureCatalog() {
  if (!catalog) {
    catalog = (async () => {
      const s = stripe();
      const found = await s.prices.list({ lookup_keys: [CATALOG.social.lookup, CATALOG.pro.lookup], active: true, limit: 10 });
      const ids: Record<string, string> = {};
      for (const key of ["social", "pro"] as const) {
        const c = CATALOG[key];
        const existing = found.data.find((p) => p.lookup_key === c.lookup);
        if (existing) ids[key] = existing.id;
        else {
          const product = await s.products.create({ name: c.product });
          const price = await s.prices.create({
            product: product.id, currency: "usd", unit_amount: c.cents, recurring: { interval: "month" }, lookup_key: c.lookup, transfer_lookup_key: true,
          });
          ids[key] = price.id;
        }
      }
      try {
        await s.coupons.retrieve(TRIAL_COUPON);
      } catch {
        await s.coupons.create({ id: TRIAL_COUPON, name: "First month $4.99", amount_off: 1500, currency: "usd", duration: "once" });
      }
      return { social: ids.social, pro: ids.pro, coupon: TRIAL_COUPON };
    })().catch((e) => {
      catalog = null;
      throw e;
    });
  }
  return catalog;
}

/** Hosted Stripe checkout for a new subscription. The $4.99 deal applies to a business's first Social subscription only. */
export async function checkoutUrl(opts: { business: Business; plan: "trial" | "pro"; email: string; baseUrl: string }) {
  const { business: b, plan } = opts;
  const c = await ensureCatalog();
  const firstTime = !b.stripe_subscription_id && (b.subscription_status ?? "none") === "none";
  const useTrial = plan === "trial" && firstTime;
  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: plan === "pro" ? c.pro : c.social, quantity: 1 }],
    ...(useTrial ? { discounts: [{ coupon: c.coupon }] } : { allow_promotion_codes: true }),
    ...(b.stripe_customer_id ? { customer: b.stripe_customer_id } : { customer_email: opts.email || undefined }),
    client_reference_id: b.id,
    subscription_data: { metadata: { business_id: b.id, trial: useTrial ? "1" : "0" } },
    metadata: { business_id: b.id, plan },
    success_url: `${opts.baseUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${opts.baseUrl}/billing?canceled=1`,
  });
  if (!session.url) throw new Error("Stripe didn't return a checkout link");
  return session.url;
}

/** Switch an existing Social subscription to Pro right away, charging the prorated difference now. */
export async function upgradeToPro(b: Business) {
  if (!b.stripe_subscription_id) throw new Error("No subscription to upgrade");
  const c = await ensureCatalog();
  const s = stripe();
  const sub = await s.subscriptions.retrieve(b.stripe_subscription_id);
  const item = sub.items.data[0];
  if (item.price.id === c.pro) return sub;
  const updated = await s.subscriptions.update(sub.id, {
    items: [{ id: item.id, price: c.pro }],
    proration_behavior: "always_invoice",
    cancel_at_period_end: false,
    metadata: { ...sub.metadata, business_id: b.id },
  });
  await syncSubscription(updated);
  return updated;
}

export async function portalUrl(b: Business, baseUrl: string) {
  if (!b.stripe_customer_id) throw new Error("No billing account yet");
  const session = await stripe().billingPortal.sessions.create({ customer: b.stripe_customer_id, return_url: `${baseUrl}/settings#plan` });
  return session.url;
}

/** Copy a Stripe subscription's state onto the business row. */
export async function syncSubscription(sub: Stripe.Subscription, opts: { businessId?: string; trial?: boolean } = {}) {
  const sb = serviceRoleClient();
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  let businessId = opts.businessId ?? sub.metadata?.business_id;
  if (!businessId) {
    const { data } = await sb.from("businesses").select("id").eq("stripe_customer_id", customerId).maybeSingle();
    businessId = data?.id;
  }
  if (!businessId) return;
  const item = sub.items.data[0];
  const lookup = item?.price.lookup_key;
  const isPro = lookup === CATALOG.pro.lookup;
  const { data: current } = await sb.from("businesses").select("plan").eq("id", businessId).maybeSingle();
  // "trial" = the discounted first Social month; it becomes "social" at the first renewal.
  const plan = isPro ? "pro" : opts.trial || (current?.plan === "trial" && sub.metadata?.trial === "1") ? "trial" : "social";
  const periodEnd = item?.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null;
  const { error } = await sb
    .from("businesses")
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      subscription_status: sub.status,
      current_period_end: periodEnd,
      cancel_at_period_end: sub.cancel_at_period_end,
      plan: sub.status === "canceled" ? (current?.plan ?? plan) : plan,
      monthly_text_limit: isPro ? 1000 : 0,
    })
    .eq("id", businessId);
  if (error) throw new Error(`billing sync: ${error.message} (run supabase/migrations/0003_billing.sql)`);
}

/** After the first full-price renewal, the trial label goes away. */
export async function endTrialLabel(subscriptionId: string) {
  const sb = serviceRoleClient();
  await sb.from("businesses").update({ plan: "social" }).eq("stripe_subscription_id", subscriptionId).eq("plan", "trial");
  try {
    await stripe().subscriptions.update(subscriptionId, { metadata: { trial: "0" } });
  } catch {
    // label only
  }
}
