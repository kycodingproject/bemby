import { after, NextResponse, type NextRequest } from "next/server";
import { getRepo } from "@/lib/repo";
import { handleInbound } from "@/lib/inbound";
import { loadStoredMedia, storeRemoteMedia } from "@/lib/media";
import { getChannelSecrets, validMetaSignature } from "@/lib/channels/meta";
import type { MediaRef } from "@/lib/types";

export const runtime = "nodejs";

interface MessagingEvent {
  sender?: { id: string };
  recipient?: { id: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    is_deleted?: boolean;
    attachments?: { type: string; payload?: { url?: string } }[];
  };
}

/** Meta checks the webhook URL once when you set it up in the App Dashboard. */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const token = process.env.META_VERIFY_TOKEN?.trim();
  if (p.get("hub.mode") === "subscribe" && token && p.get("hub.verify_token") === token) {
    return new NextResponse(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new NextResponse("forbidden", { status: 403 });
}

/** Instagram DMs (object "instagram") and Messenger messages (object "page") arrive here. */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!validMetaSignature(raw, req.headers.get("x-hub-signature-256"))) {
    return new NextResponse("invalid signature", { status: 403 });
  }
  let body: { object?: string; entry?: { id: string; messaging?: MessagingEvent[] }[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse("bad json", { status: 400 });
  }
  const channel = body.object === "instagram" ? "instagram" : body.object === "page" ? "messenger" : null;
  if (!channel) return NextResponse.json({ ok: true });

  // Reply to Meta fast (it retries slow webhooks); Bemby answers in the background.
  after(async () => {
    const repo = getRepo();
    for (const entry of body.entry ?? []) {
      const business = await repo.getBusinessByChannelAccount(channel, entry.id);
      if (!business) continue;
      for (const ev of entry.messaging ?? []) {
        const msg = ev.message;
        const from = ev.sender?.id;
        // Skip our own sends (echoes), deleted messages, and anything without a sender.
        if (!msg || msg.is_echo || msg.is_deleted || !from || from === entry.id) continue;
        try {
          const media: MediaRef[] = [];
          for (const a of msg.attachments ?? []) {
            if (a.type !== "image") continue;
            const ref = await storeRemoteMedia(business.id, a.payload?.url);
            if (ref) media.push(ref);
          }
          const text = msg.text ?? (msg.attachments?.some((a) => a.type !== "image") ? "[Client sent an attachment Bemby can't open, like a video, audio or shared post]" : "");
          const isNew = !(await repo.listClients(business.id)).some((c) => (channel === "instagram" ? c.instagram_id : c.messenger_id) === from);
          const result = await handleInbound({
            repo, businessId: business.id, channel, from, body: text, media, providerMessageId: msg.mid, loadMedia: loadStoredMedia,
          });
          if (isNew) await fillClientName(repo, business.id, channel, from, result.inbound.conversation_id);
        } catch (e) {
          // Duplicate deliveries hit the unique provider_message_id and are safely ignored.
          if (!/duplicate key/i.test((e as Error).message)) console.error("meta inbound failed", e);
        }
      }
    }
  });
  return NextResponse.json({ ok: true });
}

/** Best effort: show the client's Instagram/Facebook name in the inbox instead of a number. */
async function fillClientName(repo: ReturnType<typeof getRepo>, businessId: string, channel: "instagram" | "messenger", from: string, conversationId: string) {
  try {
    const secrets = await getChannelSecrets(businessId);
    const conv = await repo.getConversation(conversationId);
    if (!secrets || !conv) return;
    const client = await repo.getClient(conv.client_id);
    if (!client || client.name) return;
    const url =
      channel === "instagram" && secrets.instagram_token
        ? `https://graph.instagram.com/${process.env.META_GRAPH_VERSION ?? "v25.0"}/${from}?fields=name,username&access_token=${encodeURIComponent(secrets.instagram_token)}`
        : channel === "messenger" && secrets.messenger_page_token
          ? `https://graph.facebook.com/${process.env.META_GRAPH_VERSION ?? "v25.0"}/${from}?fields=first_name,last_name&access_token=${encodeURIComponent(secrets.messenger_page_token)}`
          : null;
    if (!url) return;
    const res = await fetch(url);
    if (!res.ok) return;
    const p = (await res.json()) as { name?: string; username?: string; first_name?: string; last_name?: string };
    const name = p.name || [p.first_name, p.last_name && `${p.last_name[0]}.`].filter(Boolean).join(" ") || (p.username ? `@${p.username}` : "");
    if (name) await repo.updateClient(client.id, { name: name.slice(0, 80) });
  } catch {
    // names are a nicety; never fail the message over it
  }
}
