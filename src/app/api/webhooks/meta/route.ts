import { after, NextResponse, type NextRequest } from "next/server";
import { getRepo } from "@/lib/repo";
import { handleInbound } from "@/lib/inbound";
import { loadStoredMedia, storeRemoteMedia } from "@/lib/media";
import { getChannelSecrets, validMetaSignature } from "@/lib/channels/meta";
import { handleOwnerAppReply } from "@/lib/channels/owner-reply";
import type { Client, MediaRef } from "@/lib/types";

export const runtime = "nodejs";
// Bemby waits up to a few minutes for the client to finish typing before replying.
export const maxDuration = 300;

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
  // Plain-English answers so a failed setup is easy to diagnose by opening this URL in a browser.
  if (!token) return new NextResponse("META_VERIFY_TOKEN is not set on the server yet (add it in Vercel, then redeploy).", { status: 403 });
  if (p.get("hub.mode") !== "subscribe") return new NextResponse("Webhook is online. Waiting for Meta's verification request.", { status: 400 });
  if ((p.get("hub.verify_token") ?? "").trim() !== token) return new NextResponse("The verify token doesn't match META_VERIFY_TOKEN in Vercel.", { status: 403 });
  return new NextResponse(p.get("hub.challenge") ?? "", { status: 200 });
}

/** Instagram DMs (object "instagram") arrive here. */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!validMetaSignature(raw, req.headers.get("x-hub-signature-256"))) {
    console.error("[meta webhook] signature check failed: META_APP_SECRET / INSTAGRAM_APP_SECRET in Vercel don't match the app's secrets");
    return new NextResponse("invalid signature", { status: 403 });
  }
  let body: { object?: string; entry?: { id: string; messaging?: MessagingEvent[] }[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse("bad json", { status: 400 });
  }
  const channel = body.object === "instagram" ? "instagram" : null;
  console.log(`[meta webhook] received object=${body.object} accounts=${(body.entry ?? []).map((e) => e.id).join(",")}`);
  if (!channel) return NextResponse.json({ ok: true });

  // Reply to Meta fast (it retries slow webhooks); Bemby answers in the background.
  after(async () => {
    const repo = getRepo();
    for (const entry of body.entry ?? []) {
      const business = await repo.getBusinessByChannelAccount(channel, entry.id);
      if (!business) {
        console.error(`[meta webhook] no Bemby business is connected to ${channel} account ${entry.id}. Reconnect it in Settings.`);
        continue;
      }
      for (const ev of entry.messaging ?? []) {
        const msg = ev.message;
        const from = ev.sender?.id;
        if (msg?.is_echo) {
          // A message sent FROM the business. If it wasn't sent by Bemby, the owner typed it in the Instagram app.
          if (msg.mid && ev.recipient?.id) {
            await handleOwnerAppReply(repo, { businessId: business.id, channel, clientHandle: ev.recipient.id, messageId: msg.mid, text: msg.text ?? "" })
              .catch((e) => console.error("[meta webhook] echo failed", e));
          }
          continue;
        }
        // Skip deleted messages and anything without a sender.
        if (!msg || msg.is_deleted || !from || from === entry.id) continue;
        try {
          const media: MediaRef[] = [];
          for (const a of msg.attachments ?? []) {
            if (a.type !== "image") continue;
            const ref = await storeRemoteMedia(business.id, a.payload?.url);
            if (ref) media.push(ref);
          }
          const text = msg.text ?? (msg.attachments?.some((a) => a.type !== "image") ? "[Client sent an attachment Bemby can't open, like a video, audio or shared post]" : "");
          const isNew = !(await repo.listClients(business.id)).some((c) => c.instagram_id === from);
          const result = await handleInbound({
            repo, businessId: business.id, channel, from, body: text, media, providerMessageId: msg.mid, loadMedia: loadStoredMedia,
          });
          await fillClientProfile(repo, business.id, from, result.inbound.conversation_id, isNew);
        } catch (e) {
          // Duplicate deliveries hit the unique provider_message_id and are safely ignored.
          if (!/duplicate key/i.test((e as Error).message)) console.error("meta inbound failed", e);
        }
      }
    }
  });
  return NextResponse.json({ ok: true });
}

const WEEK = 7 * 86400_000;

/**
 * Best effort: show the client's Instagram name and profile photo in the inbox.
 * Instagram's photo links expire, so a copy is kept in storage and refreshed about once a week.
 */
async function fillClientProfile(repo: ReturnType<typeof getRepo>, businessId: string, from: string, conversationId: string, isNew: boolean) {
  try {
    const conv = await repo.getConversation(conversationId);
    const client = conv ? await repo.getClient(conv.client_id) : null;
    if (!client) return;
    const checked = client.avatar_checked_at ? new Date(client.avatar_checked_at).getTime() : 0;
    if (!isNew && client.name && Date.now() - checked < WEEK) return;
    const secrets = await getChannelSecrets(businessId);
    if (!secrets?.instagram_token) return;
    const res = await fetch(`https://graph.instagram.com/${process.env.META_GRAPH_VERSION ?? "v25.0"}/${from}?fields=name,username,profile_pic&access_token=${encodeURIComponent(secrets.instagram_token)}`);
    if (!res.ok) return;
    const p = (await res.json()) as { name?: string; username?: string; profile_pic?: string };
    const patch: Partial<Client> = {};
    const name = p.name || (p.username ? `@${p.username}` : "");
    if (name && !client.name) patch.name = name.slice(0, 80);
    const pic = p.profile_pic ? await storeRemoteMedia(businessId, p.profile_pic) : null;
    if (pic) patch.avatar_path = pic.path;
    patch.avatar_checked_at = new Date().toISOString();
    await repo.updateClient(client.id, patch).catch(async () => {
      // Photo columns missing (migration 0012 not run): still save the name.
      if (patch.name) await repo.updateClient(client.id, { name: patch.name });
    });
  } catch {
    // names and photos are a nicety; never fail the message over them
  }
}
