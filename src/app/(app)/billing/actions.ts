"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { checkoutUrl, portalUrl, upgradeToPro } from "@/lib/billing";
import { currentBusinessId, getRepo, isDemo } from "@/lib/repo";

async function base() {
  const h = await headers();
  return (process.env.PUBLIC_BASE_URL?.trim() || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`).replace(/\/$/, "");
}

async function owned() {
  if (isDemo()) throw new Error("Billing is only for real accounts.");
  const repo = getRepo();
  return { repo, business: (await repo.getBusiness(await currentBusinessId()))! };
}

export async function startCheckout(plan: "trial" | "pro") {
  const { business } = await owned();
  const user = await currentUser();
  const url = await checkoutUrl({ business, plan, email: user?.email ?? "", baseUrl: await base() });
  redirect(url);
}

export async function openBillingPortal() {
  const { business } = await owned();
  redirect(await portalUrl(business, await base()));
}

/** Social -> Pro for stylists who request a business number. Returns a checkout link if they don't have a plan yet. */
export async function upgradeOrCheckoutPro(): Promise<{ ok?: true; url?: string; error?: string }> {
  const { business } = await owned();
  try {
    if (business.stripe_subscription_id && ["active", "trialing", "past_due"].includes(business.subscription_status ?? "")) {
      await upgradeToPro(business);
      return { ok: true };
    }
    const user = await currentUser();
    return { url: await checkoutUrl({ business, plan: "pro", email: user?.email ?? "", baseUrl: await base() }) };
  } catch (e) {
    return { error: (e as Error).message };
  }
}
