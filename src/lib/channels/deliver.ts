import "server-only";
import twilio from "twilio";
import type { Repo } from "../repo/types";
import type { Conversation, Message } from "../types";
import { isDemo } from "../repo";
import { DEMO_TEST_PHONE } from "../repo/seed";
import { getChannelSecrets, refreshInstagramToken, saveChannelSecrets, sendInstagramText, sendMessengerText } from "./meta";

let _twilio: ReturnType<typeof twilio> | null = null;
export function twilioClient() {
  if (!_twilio) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    if (!sid || !token) throw new Error("Twilio is not configured");
    _twilio = twilio(sid, token);
  }
  return _twilio;
}

/**
 * Send a stored outgoing message to the client on its channel and mark it sent/failed.
 * The sample studio and the practice chat never leave the app; the message just shows as sent.
 */
export async function deliver(repo: Repo, conversation: Conversation, message: Message): Promise<Message> {
  const business = await repo.getBusiness(conversation.business_id);
  const client = await repo.getClient(conversation.client_id);
  if (!business || !client) throw new Error("missing business or client");
  // The sample studio and the "Test Bemby" chat never send real texts.
  if (isDemo() || client.phone === DEMO_TEST_PHONE) return repo.updateMessage(message.id, { status: "sent" });

  try {
    if (conversation.channel === "sms") {
      if (client.sms_opt_out) throw new Error("Client replied STOP and has opted out of texts");
      if (!business.phone_number || !client.phone) throw new Error("Missing phone number");
      const sent = await twilioClient().messages.create({ from: business.phone_number, to: client.phone, body: message.body });
      return repo.updateMessage(message.id, { status: "sent", provider_message_id: sent.sid });
    }
    // Instagram / Messenger: replies are free within 24h of the client's last message, then need the HUMAN_AGENT tag (up to 7 days).
    const msgs = await repo.listMessages(conversation.id, 60);
    const lastClient = [...msgs].reverse().find((m) => m.author === "client");
    const age = lastClient ? Date.now() - new Date(lastClient.created_at).getTime() : Infinity;
    if (age > 7 * 86400_000) throw new Error("Meta only allows replies within 7 days of the client's last message. Ask them to message you again.");
    const humanAgent = age > 24 * 3600_000;
    const secrets = await getChannelSecrets(business.id);
    // Instagram tokens last 60 days; renew quietly when fewer than 10 days are left.
    if (conversation.channel === "instagram" && secrets?.instagram_token && secrets.instagram_token_expires_at) {
      const left = new Date(secrets.instagram_token_expires_at).getTime() - Date.now();
      if (left < 10 * 86400_000 && left > 0) {
        try {
          const r = await refreshInstagramToken(secrets.instagram_token);
          await saveChannelSecrets(business.id, { instagram_token: r.token, instagram_token_expires_at: r.expiresAt });
          secrets.instagram_token = r.token;
        } catch (e) {
          console.error("instagram token refresh failed", e);
        }
      }
    }
    const to = conversation.channel === "instagram" ? client.instagram_id : client.messenger_id;
    if (!to) throw new Error("Missing the client's account id");
    let id: string;
    if (conversation.channel === "instagram") {
      if (!secrets?.instagram_token || !secrets.instagram_user_id) throw new Error("Instagram isn't connected. Reconnect it in Settings.");
      id = await sendInstagramText({ igUserId: secrets.instagram_user_id, token: secrets.instagram_token, to, text: message.body, humanAgent });
    } else {
      if (!secrets?.messenger_page_token) throw new Error("Messenger isn't connected. Reconnect it in Settings.");
      id = await sendMessengerText({ pageToken: secrets.messenger_page_token, to, text: message.body, humanAgent });
    }
    return repo.updateMessage(message.id, { status: "sent", provider_message_id: id });
  } catch (e) {
    console.error("deliver failed", e);
    return repo.updateMessage(message.id, { status: "failed", approval_reason: (e as Error).message });
  }
}
