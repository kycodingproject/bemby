import "server-only";
import twilio from "twilio";
import type { Repo } from "../repo/types";
import type { Conversation, Message } from "../types";
import { isDemo } from "../repo";
import { DEMO_TEST_PHONE } from "../repo/seed";

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
 * In demo mode nothing leaves the app; the message just shows as sent.
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
    // Instagram / Messenger sending is wired up with the Meta connection milestone.
    throw new Error(`${conversation.channel} sending is not connected yet`);
  } catch (e) {
    console.error("deliver failed", e);
    return repo.updateMessage(message.id, { status: "failed", approval_reason: (e as Error).message });
  }
}
