import "server-only";
import type { Repo } from "./repo/types";
import type { Channel, MediaRef } from "./types";
import { runBemby, type MediaLoader } from "./ai/agent";
import { deliver } from "./channels/deliver";
import { hasActivePlan } from "./billing";
import { DEMO_TEST_PHONE } from "./repo/seed";
import { isDemo } from "./repo";
import { chatUnlocked, QUIET_NOTE, triggerWordsFor } from "./triggers";

/** Webhook functions may run up to 300s on Vercel; keep the wait well inside that. */
export const MAX_DELAY_SECONDS = 180;

const STOP_WORDS = ["stop", "stopall", "unsubscribe", "cancel", "end", "quit"];
const START_WORDS = ["start", "unstop", "yes"];

/**
 * Everything that happens when a client message arrives, on any channel:
 * store it, let Bemby answer (unless paused / owner took over), and send or hold the reply.
 */
export async function handleInbound(opts: {
  repo: Repo;
  businessId: string;
  channel: Channel;
  from: string;
  body: string;
  media?: MediaRef[];
  providerMessageId?: string;
  loadMedia?: MediaLoader;
  /** Override the business setting (the practice chat answers right away). */
  replyDelaySeconds?: number;
}) {
  const { repo, businessId, channel, from } = opts;
  const client = await repo.findOrCreateClient(businessId, channel, from);
  const conversation = await repo.findOrCreateConversation(businessId, client.id, channel);
  const inbound = await repo.addMessage({
    business_id: businessId,
    conversation_id: conversation.id,
    author: "client",
    body: opts.body,
    media: opts.media ?? [],
    status: "received",
    approval_reason: null,
    ...(opts.providerMessageId ? { provider_message_id: opts.providerMessageId } : {}),
  });

  // Carrier opt-out keywords: Twilio blocks further texts; we record it and stay quiet.
  const word = opts.body.trim().toLowerCase();
  if (channel === "sms" && STOP_WORDS.includes(word)) {
    await repo.updateClient(client.id, { sms_opt_out: true });
    return { inbound, reply: null };
  }
  if (channel === "sms" && START_WORDS.includes(word) && client.sms_opt_out) {
    await repo.updateClient(client.id, { sms_opt_out: false });
  }

  // No paid plan: keep the message for the owner, but Bemby stays quiet (the practice chat always works).
  const business = await repo.getBusiness(businessId);
  if (!isDemo() && business && !hasActivePlan(business) && from !== DEMO_TEST_PHONE) return { inbound, reply: null };

  // Wait so clients can finish sending a few messages, then answer them all at once.
  // Every new message restarts the wait: only the task for the latest message replies.
  const delay = Math.max(0, Math.min(MAX_DELAY_SECONDS, opts.replyDelaySeconds ?? business?.reply_delay_seconds ?? 60));
  if (delay > 0) {
    await new Promise((r) => setTimeout(r, delay * 1000));
    const recent = await repo.listMessages(conversation.id, 20);
    const latestClient = [...recent].reverse().find((m) => m.author === "client");
    if (latestClient && latestClient.id !== inbound.id) return { inbound, reply: null };
  }

  // Stay out of personal chats: only answer once a booking word or service name comes up (or the owner says so).
  if (business && !isDemo()) {
    const services = await repo.listServices(businessId);
    const words = triggerWordsFor(business.trigger_words ?? [], services.map((s) => s.name));
    const recent = await repo.listMessages(conversation.id, 60);
    if (!chatUnlocked(recent, words)) {
      if (!recent.some((m) => m.author === "system" && m.body.startsWith(QUIET_NOTE))) {
        await repo.addMessage({
          business_id: businessId, conversation_id: conversation.id, author: "system", media: [], status: "sent", approval_reason: null,
          body: `${QUIET_NOTE} Tap "Let Bemby answer" if this is a client.`,
        });
      }
      return { inbound, reply: null };
    }
  }

  return { inbound, ...(await answerNow(repo, conversation.id, opts.loadMedia)) };
}

/** Run Bemby on a conversation and send its reply (or hold it for approval). */
export async function answerNow(repo: Repo, conversationId: string, loadMedia?: MediaLoader) {
  const result = await runBemby({ repo, conversationId, loadMedia });
  let reply = result.message;
  const conversation = await repo.getConversation(conversationId);
  if (reply && reply.status === "sent" && conversation) reply = await deliver(repo, conversation, reply);
  return { reply, result };
}
