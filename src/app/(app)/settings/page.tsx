import { currentBusinessId, getRepo, isDemo } from "@/lib/repo";
import { currentUser } from "@/lib/auth";
import { getChannelSecrets } from "@/lib/channels/meta";
import { ChannelsPanel } from "@/components/ChannelsPanel";
import { SettingsForm } from "@/components/SettingsForm";
import { ProfileEditor } from "@/components/ProfileEditor";
import { BUSINESS_TYPES } from "@/lib/templates";
import { dollars } from "@/lib/validation";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ connected?: string; error?: string }> }) {
  const repo = getRepo();
  const b = (await repo.getBusiness(await currentBusinessId()))!;
  const services = await repo.listServices(b.id);
  const type = BUSINESS_TYPES.find((t) => t.id === b.business_type) ?? BUSINESS_TYPES[BUSINESS_TYPES.length - 1];
  const fmtPhone = (p: string | null) => (p && /^\+1\d{10}$/.test(p) ? `(${p.slice(2, 5)}) ${p.slice(5, 8)}-${p.slice(8)}` : p);
  const sp = await searchParams;
  const notice = sp.connected ? { ok: true, text: `Connected ${sp.connected}. Bemby will answer new messages there.` } : sp.error ? { ok: false, text: sp.error } : null;
  let pendingPages: { id: string; name: string }[] = [];
  let email = "";
  if (!isDemo()) {
    const secrets = await getChannelSecrets(b.id).catch(() => null);
    pendingPages = (secrets?.pending_pages ?? []).map((p) => ({ id: p.id, name: p.name }));
    email = (await currentUser())?.email ?? "";
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1.5 text-sm text-muted">Your services, hours, and how much Bemby does on its own.</p>
      </header>

      <ChannelsPanel
        demo={isDemo()}
        instagram={b.instagram_account_id ? b.instagram_username ?? "connected" : null}
        messenger={b.messenger_page_id ? b.messenger_page_name ?? "your Page" : null}
        pendingPages={pendingPages}
        phone={fmtPhone(b.phone_number)}
        textingStatus={b.texting_status ?? "none"}
        email={email}
        notice={notice}
      />

      <SettingsForm autonomy={b.autonomy} askFirst={b.ask_first} paused={b.paused} />

      <ProfileEditor
        key={b.id}
        name={b.name}
        ownerName={b.owner_name}
        services={services.map((s) => ({ id: s.id, name: s.name, price: dollars(s.price_cents), minutes: s.duration_minutes, deposit: s.deposit_cents ? dollars(s.deposit_cents) : "", intake: s.intake }))}
        suggestions={type.asks}
        hours={b.hours}
        minNoticeHours={b.min_notice_hours}
        bufferMinutes={b.buffer_minutes}
        policies={b.policies}
      />

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-label="Calendars and tools" className="card p-6">
          <h2 className="mb-1.5 font-display text-xl font-semibold">Calendars & tools</h2>
          {[
            { name: "Google Calendar", detail: "Two-way sync", status: "Coming soon" },
            { name: "Apple Calendar", detail: "Two-way sync", status: "Coming soon" },
            { name: "Vagaro", detail: "Sync appointments, clients and open times", status: "After launch" },
          ].map((c) => (
            <div key={c.name} className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-3.5 last:border-0">
              <div>
                <p className="text-sm font-semibold">{c.name}</p>
                <p className="mt-0.5 text-[13px] text-muted">{c.detail}</p>
              </div>
              <span className="text-[13px] text-muted">{c.status}</span>
            </div>
          ))}
        </section>

        <section aria-label="Plan" className="card flex flex-col gap-3.5 p-6">
          <h2 className="font-display text-xl font-semibold">Plan</h2>
          <p className="flex items-baseline gap-2"><span className="font-display text-4xl font-bold">$39</span><span className="text-sm text-muted">/ month · Bemby</span></p>
          <p className="text-sm text-ink-2">Includes {b.monthly_text_limit.toLocaleString()} texts a month. Instagram and Messenger chats don&apos;t count toward your limit.</p>
          <p className="text-[13px] leading-relaxed text-muted">Need more? Add 500 texts for $10. First month is $19. Billing turns on with the Stripe connection.</p>
        </section>
      </div>
    </div>
  );
}
