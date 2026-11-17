import { after, NextResponse, type NextRequest } from "next/server";
import { getRepo } from "@/lib/repo";
import { handleInbound } from "@/lib/inbound";
import { loadStoredMedia, storeRemoteMedia } from "@/lib/media";
import { tiktokImageLink, validTikTokSignature } from "@/lib/channels/tiktok";
import { handleOwnerAppReply } from "@/lib/channels/owner-reply";
import type { MediaRef } from "@/lib/types";

export const runtime = "nodejs";
// Bemby waits up to a few minutes for the client to finish typing before replying.
export const maxDuration = 300;

/** The `content` field of a TikTok direct-message event (it arrives as a JSON string). */
interface TikTokMessage {
  conversation_id?: string;
  message_id?: string;
  type?: string; // text | image | sticker | share_post | ...
  text?: { body?: string };
  image?: { media_id?: string };
  from?: string; // sender's username
  from_user?: { id?: string };
  to_user?: { id?: string };
}

/** TikTok DMs arrive here: im_receive_msg (a client wrote) and im_send_msg (the business sent something). */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!validTikTokSignature(raw, req.headers.get("tiktok-signature"))) {
    console.error("[tiktok webhook] signature check failed: TIKTOK_APP_SECRET in Vercel doesn't match the app's secret");
    return new NextResponse("invalid signature", { status: 401 });
  }
  let event: { event?: string; user_openid?: string; content?: string };
  let msg: TikTokMessage;
  try {
    event = JSON.parse(raw);
    msg = typeof event.content === "string" ? JSON.parse(event.content) : (event.content ?? {});
  } catch {
    return new NextResponse("bad json", { status: 400 });
  }
  console.log(`[tiktok webhook] received event=${event.event} account=${event.user_openid}`);
  if (event.event !== "im_receive_msg" && event.event !== "im_send_msg") return NextResponse.json({ ok: true });

  // Answer TikTok fast; Bemby replies in the background.
  after(async () => {
    try {
      const repo = getRepo();
      const accountId = event.user_openid ?? "";
      const business = await repo.getBusinessByChannelAccount("tiktok", accountId);
      if (!business) return console.error(`[tiktok webhook] no Bemby business is connected to TikTok account ${accountId}. Reconnect it in Settings.`);
      const conversationId = msg.conversation_id;
      const messageId = msg.message_id;
      if (!conversationId || !messageId) return;
      const fromBusiness = event.event === "im_send_msg" || msg.from_user?.id === accountId;
      const text = msg.type === "text" ? msg.text?.body ?? "" : "";

      if (fromBusiness) {
        // Sent by Bemby (ignored) or typed by the owner in the TikTok app (Bemby steps back).
        return await handleOwnerAppReply(repo, { businessId: business.id, channel: "tiktok", clientHandle: conversationId, messageId, text });
      }

      const media: MediaRef[] = [];
      if (msg.type === "image" && msg.image?.media_id) {
        const link = await tiktokImageLink({ businessId: business.id, conversationId, messageId, mediaId: msg.image.media_id }).catch(() => null);
        const ref = link ? await storeRemoteMedia(business.id, link.url, link.headers) : null;
        if (ref) media.push(ref);
      }
      const body = text || (media.length ? "" : msg.type === "image" ? "[Client sent a photo Bemby couldn't open]" : "[Client sent something Bemby can't open, like a video, sticker or shared post]");
      const isNew = !(await repo.listClients(business.id)).some((c) => c.tiktok_id === conversationId);
      const result = await handleInbound({ repo, businessId: business.id, channel: "tiktok", from: conversationId, body, media, providerMessageId: messageId, loadMedia: loadStoredMedia });
      // Show the client's TikTok username in the inbox.
      if (isNew && msg.from) {
        const conv = await repo.getConversation(result.inbound.conversation_id);
        const client = conv ? await repo.getClient(conv.client_id) : null;
        if (client && !client.name) await repo.updateClient(client.id, { name: `@${msg.from}`.slice(0, 80) });
      }
    } catch (e) {
      // Duplicate deliveries hit the unique provider_message_id and are safely ignored.
      if (!/duplicate key/i.test((e as Error).message)) console.error("tiktok inbound failed", e);
    }
  });
  return NextResponse.json({ ok: true });
}
