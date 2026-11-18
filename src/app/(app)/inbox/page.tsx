import Link from "next/link";
import { currentBusinessId, getRepo, isDemo } from "@/lib/repo";
import { DEMO_TEST_PHONE } from "@/lib/repo/seed";
import { photoUrl } from "@/lib/media";
import { Thread } from "@/components/Thread";
import { TestBemby } from "@/components/TestBemby";
import { AutoRefresh } from "@/components/AutoRefresh";
import { PageHeader } from "@/components/icons";
import { Avatar } from "@/components/Avatar";

const CHANNEL = { sms: "Text", instagram: "Instagram", tiktok: "TikTok" } as const;

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ c?: string; other?: string }> }) {
  const repo = getRepo();
  const businessId = await currentBusinessId();
  const business = (await repo.getBusiness(businessId))!;
  const convos = await repo.listConversations(businessId);
  const { c, other } = await searchParams;
  const aiChats = await repo.listAiConversationIds(businessId);

  const rows = await Promise.all(
    convos.map(async (cv) => {
      const client = await repo.getClient(cv.client_id);
      const msgs = await repo.listMessages(cv.id, 6);
      const pending = msgs.some((m) => m.status === "pending_approval");
      const last = [...msgs].reverse().find((m) => m.author !== "system");
      let status =
        cv.mode === "owner" ? { text: "You took over", tone: "warn" }
        : cv.mode === "needs_owner" ? { text: "Needs you", tone: "danger" }
        : pending ? { text: "Reply waiting for your OK", tone: "warn" }
        : { text: "Bemby is handling it", tone: "ok" };
      const isTest = client?.phone === DEMO_TEST_PHONE;
      // Client chats: Bemby has replied, it needs the owner, or a reply is waiting. Everything else
      // (friends, family, random DMs where Bemby stayed quiet) goes under "Other DMs".
      const isClient = aiChats.has(cv.id) || cv.mode === "needs_owner" || pending || isTest;
      if (!isClient) status = cv.mode === "owner" ? { text: "You're chatting", tone: "muted" } : { text: "Bemby is staying out", tone: "muted" };
      const avatarUrl = client?.avatar_path ? await photoUrl({ path: client.avatar_path, content_type: "image/jpeg" }) : null;
      return { cv, isClient, avatarUrl, name: client?.name ?? (isTest ? "You (test client)" : client?.phone ?? "New client"), status, preview: last?.body || (last?.media.length ? "Sent a photo" : "") };
    }),
  );
  const clientRows = rows.filter((r) => r.isClient);
  const otherRows = rows.filter((r) => !r.isClient);
  const showOther = other === "1";
  const listed = showOther ? otherRows : clientRows;
  const selected = rows.find((r) => r.cv.id === c) ?? listed[0];
  const messages = selected ? await repo.listMessages(selected.cv.id, 100) : [];
  const withUrls = await Promise.all(
    messages.map(async (m) => ({ ...m, media: await Promise.all(m.media.map(async (ref) => ({ ...ref, url: await photoUrl(ref) }))) })),
  );

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh seconds={5} />
      <PageHeader icon="inbox" title="Inbox" sub="Your client chats in one place. Watch Bemby work, or jump in anytime." />

      <TestBemby businessName={business.name} canReset={isDemo()} />

      <div className="flex flex-wrap items-start gap-6">
        <section aria-label="Conversations" className="card flex min-w-64 flex-1 basis-64 flex-col gap-1 p-2.5">
          {showOther && (
            <div className="flex flex-col gap-1 px-3.5 pb-2 pt-2.5">
              <Link href="/inbox" className="text-sm font-semibold text-brand-ink hover:underline">← Client chats</Link>
              <p className="text-[13px] leading-relaxed text-muted">DMs where Bemby stayed quiet, like friends and family. Open one and tap &ldquo;Let Bemby answer&rdquo; if it&apos;s actually a client.</p>
            </div>
          )}
          {listed.length === 0 && (
            <p className="p-4 text-sm text-muted">{showOther ? "No other DMs." : "No client chats yet. They show up here as soon as Bemby starts chatting with a client."}</p>
          )}
          {listed.map((r) => {
            const on = r.cv.id === selected?.cv.id;
            return (
              <Link
                key={r.cv.id}
                href={`/inbox?c=${r.cv.id}${showOther ? "&other=1" : ""}`}
                aria-current={on ? "true" : undefined}
                className={`flex items-center gap-3 rounded-2xl p-3.5 ${on ? "bg-brand-soft shadow-[inset_0_0_0_1px_rgba(106,75,245,0.35)]" : "hover:bg-hover"}`}
              >
                <Avatar name={r.name} url={r.avatarUrl} />
                <span className="min-w-0 flex-1">
                  <span className="flex justify-between gap-2">
                    <span className="truncate font-semibold">{r.name}</span>
                    <span className="shrink-0 text-xs text-muted">{CHANNEL[r.cv.channel]}</span>
                  </span>
                  <span className={`mt-0.5 block text-[13px] ${r.status.tone === "ok" ? "text-ok" : r.status.tone === "danger" ? "text-danger" : r.status.tone === "muted" ? "text-muted" : "text-warn"}`}>{r.status.text}</span>
                  <span className="mt-0.5 block truncate text-[13px] text-muted">{r.preview}</span>
                </span>
              </Link>
            );
          })}
          {!showOther && otherRows.length > 0 && (
            <Link href="/inbox?other=1" className="mt-1 flex flex-col gap-0.5 rounded-2xl border-t border-line px-3.5 py-3 hover:bg-hover">
              <span className="text-sm font-semibold text-ink-2">Other DMs ({otherRows.length})</span>
              <span className="text-xs text-muted">Personal chats Bemby stayed out of</span>
            </Link>
          )}
        </section>

        {selected && (
          <Thread
            key={selected.cv.id}
            conversation={selected.cv}
            clientName={selected.name}
            avatarUrl={selected.avatarUrl}
            channelLabel={CHANNEL[selected.cv.channel]}
            ownerName={business.owner_name}
            messages={withUrls}
          />
        )}
      </div>
    </div>
  );
}
