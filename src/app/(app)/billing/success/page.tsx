import { redirect } from "next/navigation";
import { stripe, syncSubscription } from "@/lib/billing";
import { currentBusinessId } from "@/lib/repo";

/** Stripe sends the owner back here after paying. Sync right away so the dashboard is unlocked without waiting on the webhook. */
export default async function BillingSuccess({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const businessId = await currentBusinessId();
  const { session_id } = await searchParams;
  if (session_id) {
    try {
      const s = await stripe().checkout.sessions.retrieve(session_id, { expand: ["subscription"] });
      if (s.client_reference_id === businessId && s.subscription && typeof s.subscription !== "string") {
        await syncSubscription(s.subscription, { businessId, trial: s.subscription.metadata?.trial === "1" });
      }
    } catch (e) {
      console.error("billing success sync failed", e);
    }
  }
  redirect("/?welcome=1");
}
