import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { endTrialLabel, stripe, syncSubscription } from "@/lib/billing";

export const runtime = "nodejs";

/** Stripe tells Bemby about payments, plan changes and cancellations here. */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) return new NextResponse("not configured", { status: 503 });
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, req.headers.get("stripe-signature") ?? "", secret);
  } catch {
    return new NextResponse("invalid signature", { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object;
        if (s.mode === "subscription" && s.subscription) {
          const sub = await stripe().subscriptions.retrieve(typeof s.subscription === "string" ? s.subscription : s.subscription.id);
          await syncSubscription(sub, { businessId: s.client_reference_id ?? undefined, trial: sub.metadata?.trial === "1" });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await syncSubscription(event.data.object);
        break;
      case "invoice.paid": {
        const inv = event.data.object;
        const subId = inv.parent?.subscription_details?.subscription;
        if (inv.billing_reason === "subscription_cycle" && subId) await endTrialLabel(typeof subId === "string" ? subId : subId.id);
        break;
      }
    }
  } catch (e) {
    console.error("stripe webhook failed", event.type, e);
    return new NextResponse("error", { status: 500 }); // Stripe retries
  }
  return NextResponse.json({ received: true });
}
