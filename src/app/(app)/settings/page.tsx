import { currentBusinessId, getRepo, isDemo } from "@/lib/repo";
import { currentUser } from "@/lib/auth";
import { tiktokConfigured } from "@/lib/channels/tiktok";
import { headers } from "next/headers";
import { CalendarSync } from "@/components/CalendarSync";
import { feedStatuses } from "@/lib/calendar/external";
import { ChannelsPanel } from "@/components/ChannelsPanel";
import { SettingsForm } from "@/components/SettingsForm";
import { ProfileEditor } from "@/components/ProfileEditor";
import { BUSINESS_TYPES } from "@/lib/templates";
import { dollars } from "@/lib/validation";
import { EXTRA_TEXTS, PLANS, planOf } from "@/lib/plans";
import Link from "next/link";
import { billingEnabled, hasActivePlan } from "@/lib/billing";
import { openBillingPortal } from "../billing/actions";
import { DeleteAccount } from "@/components/DeleteAccount";
import { SettingsTabs } from "@/components/SettingsTabs";
import { SETTINGS_TABS, type SettingsTab } from "@/lib/settings-tabs";

// Reading a price-list photo with the AI can take ~30 seconds.
export const maxDuration = 60;

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string; tab?: string }> }) {
  const repo = getRepo();
  const b = (await repo.getBusiness(await currentBusinessId()))!;
  const services = await repo.listServices(b.id);
  const type = BUSINESS_TYPES.find((t) => t.id === b.business_type) ?? BUSINESS_TYPES[BUSINESS_TYPES.length - 1];
  const fmtPhone = (p: string | null) => (p && /^\+1\d{10}$/.test(p) ? `(${p.slice(2, 5)}) ${p.slice(5, 8)}-${p.slice(8)}` : p);
  const plan = planOf(b.plan);
  const sp = await searchParams;
  const notice = sp.connected ? { ok: true, text: `Connected ${sp.connected}. Bemby will answer new messages there.` } : sp.error ? { ok: false, text: sp.error } : null;
  const tab: SettingsTab = SETTINGS_TABS.some((t) => t.id === sp.tab) ? (sp.tab as SettingsTab) : notice ? "channels" : "business";
  const email = isDemo() ? "" : (await currentUser())?.email ?? "";
  const h = await headers();
  const siteUrl = (process.env.PUBLIC_BASE_URL?.trim() || `https://${h.get("x-forwarded-host") ?? h.get("host") ?? ""}`).replace(/\/$/, "");

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1.5 text-sm text-muted">Your services, hours, and how much Bemby does on its own.</p>
      </header>

      <SettingsTabs active={tab} />

      {tab === "channels" && (
      <ChannelsPanel
        demo={isDemo()}
        instagram={b.instagram_account_id ? b.instagram_username ?? "connected" : null}
        tiktok={b.tiktok_account_id ? (b.tiktok_username ? `@${b.tiktok_username}` : "your TikTok account") : null}
        tiktokAvailable={!isDemo() && tiktokConfigured()}
        phone={fmtPhone(b.phone_number)}
        textingStatus={b.texting_status ?? "none"}
        email={email}
        notice={notice}
        billing={billingEnabled()}
      />
      )}

      {tab === "receptionist" && <SettingsForm autonomy={b.autonomy} askFirst={b.ask_first} paused={b.paused} replyDelay={b.reply_delay_seconds ?? 60} triggerWords={b.trigger_words ?? []} serviceNames={services.map((s) => s.name)} />}

      {(tab === "business" || tab === "services" || tab === "hours") && (
      <ProfileEditor
        key={`${b.id}-${tab}`}
        show={tab}
        name={b.name}
        ownerName={b.owner_name}
        assistantName={b.assistant_name ?? ""}
        assistantRole={b.assistant_role ?? "assistant"}
        address={b.address ?? ""}
        addressNote={b.address_note ?? ""}
        addressPublic={b.address_public !== false}
        services={services.map((s) => ({ id: s.id, name: s.name, price: dollars(s.price_cents), minutes: s.duration_minutes, deposit: s.deposit_cents ? dollars(s.deposit_cents) : "", intake: s.intake }))}
        suggestions={type.asks}
        businessType={type.id}
        hours={b.hours}
        minNoticeHours={b.min_notice_hours}
        bufferMinutes={b.buffer_minutes}
        policies={b.policies}
      />
      )}

      {tab === "calendar" && (
      <>
      <CalendarSync
        demo={isDemo()}
        feeds={isDemo() || tab !== "calendar" ? [] : await feedStatuses(b)}
        allDayBlocks={b.calendar_all_day_blocks !== false}
        bookingsLink={b.calendar_token ? `${siteUrl}/api/calendar/${b.calendar_token}.ics` : null}
      />

        <section aria-label="More tools" className="card p-6">
          <h2 className="mb-1.5 font-display text-xl font-semibold">More tools</h2>
          <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
            <div>
              <p className="text-sm font-semibold">Vagaro</p>
              <p className="mt-0.5 text-[13px] text-muted">Vagaro appointments can already block times through Google Calendar (see Calendar sync above). A direct connection is coming.</p>
            </div>
            <span className="text-[13px] text-muted">After launch</span>
          </div>
        </section>
      </>
      )}

      {tab === "plan" && (
      <>
        <section id="plan" aria-label="Plan" className="card flex flex-col gap-3.5 p-6">
          <h2 className="font-display text-xl font-semibold">Plan</h2>
          <p className="flex items-baseline gap-2">
            <span className="font-display text-4xl font-bold">{plan.price}</span>
            <span className="text-sm text-muted">{plan.period} · {plan.name}</span>
          </p>
          <p className="text-sm text-ink-2">{plan.summary}</p>
          {plan.id === "pro" ? (
            <p className="text-[13px] leading-relaxed text-muted">Includes {b.monthly_text_limit.toLocaleString()} texts a month. Instagram chats don&apos;t count. {EXTRA_TEXTS}</p>
          ) : (
            <p className="text-[13px] leading-relaxed text-muted">Want clients to text you too? {PLANS.pro.name} adds a business phone number for {PLANS.pro.price}/month. Request it in the <Link href="/settings?tab=channels" className="underline">Messaging</Link> tab.</p>
          )}
          {billingEnabled() && !isDemo() ? (
            <div className="flex flex-col gap-2.5">
              {hasActivePlan(b) ? (
                <p className="text-[13px] text-muted">
                  {b.cancel_at_period_end ? "Cancels" : "Renews"}
                  {b.current_period_end ? ` on ${new Date(b.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric" })}` : ""}
                  {b.subscription_status === "past_due" ? ". Your last payment didn't go through; update your card to keep Bemby on." : "."}
                </p>
              ) : (
                <p className="text-[13px] text-warn">No active plan. Bemby is off until you pick one.</p>
              )}
              <div className="flex flex-wrap gap-2">
                {!hasActivePlan(b) && <Link href="/billing" className="btn btn-primary">Choose a plan</Link>}
                {b.stripe_customer_id && (
                  <form action={openBillingPortal}>
                    <button className="btn btn-ghost">Manage billing</button>
                  </form>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[13px] text-muted">Payments aren&apos;t connected yet, so Bemby is free for now. Add STRIPE_SECRET_KEY in Vercel and redeploy to turn on the plan picker.</p>
          )}
        </section>

      {!isDemo() && <DeleteAccount />}
      <p className="text-center text-xs text-muted">
        <Link href="/privacy" className="underline">Privacy Policy</Link> · <Link href="/terms" className="underline">Terms of Service</Link> · <Link href="/data-deletion" className="underline">Data deletion</Link>
      </p>
      </>
      )}
    </div>
  );
}
