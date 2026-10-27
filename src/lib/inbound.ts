import "server-only";
import type { Repo } from "./repo/types";
import type { Channel, MediaRef } from "./types";
import { runBemby, type MediaLoader } from "./ai/agent";
import { deliver } from "./channels/deliver";

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

  const result = await runBemby({ repo, conversationId: conversation.id, loadMedia: opts.loadMedia });
  let reply = result.message;
  if (reply && reply.status === "sent") reply = await deliver(repo, conversation, reply);
  return { inbound, reply, result };
}
