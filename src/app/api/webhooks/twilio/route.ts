import { after, NextResponse, type NextRequest } from "next/server";
import twilio from "twilio";
import { getRepo } from "@/lib/repo";
import { handleInbound } from "@/lib/inbound";
import type { MediaRef } from "@/lib/types";
import { storeTwilioMedia, loadStoredMedia } from "@/lib/media";

export const runtime = "nodejs";

const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

/** Twilio calls this for every text sent to a Bemby number. */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const params: Record<string, string> = {};
  form.forEach((v, k) => (params[k] = String(v)));

  // Reject anything that is not really from Twilio.
  const signature = req.headers.get("x-twilio-signature") ?? "";
  const url = `${process.env.PUBLIC_BASE_URL ?? req.nextUrl.origin}/api/webhooks/twilio`;
  if (!process.env.TWILIO_AUTH_TOKEN || !twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN, signature, url, params)) {
    return new NextResponse("invalid signature", { status: 403 });
  }

  const repo = getRepo();
  const business = await repo.getBusinessByPhone(params.To);
  if (!business) return new NextResponse(EMPTY_TWIML, { headers: { "content-type": "text/xml" } });

  // Answer Twilio right away; Bemby thinks and replies in the background.
  after(async () => {
    const count = Number(params.NumMedia ?? 0);
    const media: MediaRef[] = [];
    for (let i = 0; i < count; i++) {
      const ref = await storeTwilioMedia(business.id, params[`MediaUrl${i}`], params[`MediaContentType${i}`]);
      if (ref) media.push(ref);
    }
    await handleInbound({
      repo,
      businessId: business.id,
      channel: "sms",
      from: params.From,
      body: params.Body ?? "",
      media,
      providerMessageId: params.MessageSid,
      loadMedia: loadStoredMedia,
    });
  });

  return new NextResponse(EMPTY_TWIML, { headers: { "content-type": "text/xml" } });
}
