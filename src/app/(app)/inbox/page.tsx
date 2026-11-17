import Link from "next/link";
import { currentBusinessId, getRepo, isDemo } from "@/lib/repo";
import { DEMO_TEST_PHONE } from "@/lib/repo/seed";
import { photoUrl } from "@/lib/media";
import { Thread } from "@/components/Thread";
import { TestBemby } from "@/components/TestBemby";
import { AutoRefresh } from "@/components/AutoRefresh";
import { PageHeader } from "@/components/icons";

const CHANNEL = { sms: "Text", instagram: "Instagram", tiktok: "TikTok" } as const;

/** Gradient avatar colors, picked from the client's name so each person keeps theirs. */
const AVATARS = [
  "linear-gradient(140deg, #8c6bff, #6a4bf5)",
  "linear-gradient(140deg, #ff8fc7, #e05aa8)",
  "linear-gradient(140deg, #6fd3ff, #4b7bf5)",
  "linear-gradient(140deg, #ffc48a, #f07a4b)",
  "linear-gradient(140deg, #5fe0b5, #1a9e86)",
];

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const repo = getRepo();
  const businessId = await currentBusinessId();
  const business = (await repo.getBusiness(businessId))!;
  const convos = await repo.listConversations(businessId);
  const { c } = await searchParams;

  const rows = await Promise.all(
    convos.map(async (cv) => {
      const client = await repo.getClient(cv.client_id);
      const msgs = await repo.listMessages(cv.id, 6);
      const pending = msgs.some((m) => m.status === "pending_approval");
      const last = [...msgs].reverse().find((m) => m.author !== "system");
      const status =
        cv.mode === "owner" ? { text: "You took over", tone: "warn" }
        : cv.mode === "needs_owner" ? { text: "Needs you", tone: "danger" }
        : pending ? { text: "Reply waiting for your OK", tone: "warn" }
        : { text: "Bemby is handling it", tone: "ok" };
      const isTest = client?.phone === DEMO_TEST_PHONE;
      return { cv, name: client?.name ?? (isTest ? "You (test client)" : client?.phone ?? "New client"), status, preview: last?.body || (last?.media.length ? "Sent a photo" : "") };
    }),
  );
  const selected = rows.find((r) => r.cv.id === c) ?? rows[0];
  const messages = selected ? await repo.listMessages(selected.cv.id, 100) : [];
  const withUrls = await Promise.all(
    messages.map(async (m) => ({ ...m, media: await Promise.all(m.media.map(async (ref) => ({ ...ref, url: await photoUrl(ref) }))) })),
  );

  return (
    <div className="flex flex-col gap-6">
      <AutoRefresh seconds={5} />
      <PageHeader icon="inbox" title="Inbox" sub="Every DM and text in one place. Watch Bemby work, or jump in anytime." />

      <TestBemby businessName={business.name} canReset={isDemo()} />

      <div className="flex flex-wrap items-start gap-6">
        <section aria-label="Conversations" className="card flex min-w-64 flex-1 basis-64 flex-col gap-1 p-2.5">
          {rows.length === 0 && <p className="p-4 text-sm text-muted">No conversations yet. They show up here as soon as a client texts or DMs.</p>}
          {rows.map((r) => {
            const on = r.cv.id === selected?.cv.id;
            return (
              <Link
                key={r.cv.id}
                href={`/inbox?c=${r.cv.id}`}
                aria-current={on ? "true" : undefined}
                className={`flex items-center gap-3 rounded-2xl p-3.5 ${on ? "bg-brand-soft shadow-[inset_0_0_0_1px_rgba(106,75,245,0.35)]" : "hover:bg-hover"}`}
              >
                <span className="flex size-[42px] shrink-0 items-center justify-center rounded-full font-display text-[15px] font-bold text-white shadow-[inset_0_-3px_6px_rgba(0,0,0,0.18),inset_0_1px_2px_rgba(255,255,255,0.4)]" style={{ background: AVATARS[(r.name.charCodeAt(0) + (r.name.charCodeAt(1) || 0)) % AVATARS.length] }}>{r.name[0]}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex justify-between gap-2">
                    <span className="truncate font-semibold">{r.name}</span>
                    <span className="shrink-0 text-xs text-muted">{CHANNEL[r.cv.channel]}</span>
                  </span>
                  <span className={`mt-0.5 block text-[13px] ${r.status.tone === "ok" ? "text-ok" : r.status.tone === "danger" ? "text-danger" : "text-warn"}`}>{r.status.text}</span>
                  <span className="mt-0.5 block truncate text-[13px] text-muted">{r.preview}</span>
                </span>
              </Link>
            );
          })}
        </section>

        {selected && (
          <Thread
            key={selected.cv.id}
            conversation={selected.cv}
            clientName={selected.name}
            channelLabel={CHANNEL[selected.cv.channel]}
            ownerName={business.owner_name}
            messages={withUrls}
          />
        )}
      </div>
    </div>
  );
}
