import type { Repo } from "../repo/types";
import type { Channel } from "../types";

const APP_NAME: Record<Channel, string> = { sms: "your phone", instagram: "Instagram", tiktok: "TikTok" };

/**
 * A message sent FROM the business came back to us. If Bemby didn't send it, the owner typed it in the
 * Instagram or TikTok app: show it in the inbox and have Bemby step back from that chat, so it never talks
 * over the owner (this is also how friends and family stay Bemby-free: answer them yourself once).
 */
export async function handleOwnerAppReply(repo: Repo, opts: { businessId: string; channel: Channel; clientHandle: string; messageId: string; text: string }) {
  // Bemby's own sends echo back too; give delivery a moment to record their ids before deciding.
  await new Promise((r) => setTimeout(r, 8000));
  const client = await repo.findOrCreateClient(opts.businessId, opts.channel, opts.clientHandle);
  const conversation = await repo.findOrCreateConversation(opts.businessId, client.id, opts.channel);
  const recent = await repo.listMessages(conversation.id, 40);
  if (recent.some((m) => m.provider_message_id === opts.messageId)) return; // sent through Bemby
  await repo.addMessage({
    business_id: opts.businessId, conversation_id: conversation.id, author: "owner", body: opts.text || "[You sent an attachment]",
    media: [], status: "sent", approval_reason: null, provider_message_id: opts.messageId,
  });
  if (conversation.mode === "ai") {
    await repo.updateConversation(conversation.id, { mode: "owner" });
    await repo.addMessage({
      business_id: opts.businessId, conversation_id: conversation.id, author: "system", media: [], status: "sent", approval_reason: null,
      body: `You replied from ${APP_NAME[opts.channel]}, so Bemby stepped back from this chat. Tap "Hand back to Bemby" to let it answer again.`,
    });
  }
}
