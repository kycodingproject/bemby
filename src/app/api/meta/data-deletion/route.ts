import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { parseSignedRequest } from "@/lib/channels/signed-request";
import { forgetMetaUser } from "@/lib/channels/forget";

export const runtime = "nodejs";

/**
 * Meta "Data deletion request" callback. Meta posts a signed_request when a person asks
 * Instagram/Facebook to delete the data an app holds about them. We remove the connection
 * and reply with a status page link and confirmation code, as Meta requires.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const data = parseSignedRequest(form ? String(form.get("signed_request") ?? "") : null);
  if (!data?.user_id) return NextResponse.json({ error: "invalid signed_request" }, { status: 400 });
  try {
    await forgetMetaUser(String(data.user_id));
  } catch (e) {
    console.error("meta data deletion failed", e);
  }
  const code = randomUUID();
  const base = (process.env.PUBLIC_BASE_URL?.trim() || req.nextUrl.origin).replace(/\/$/, "");
  return NextResponse.json({ url: `${base}/data-deletion?code=${code}`, confirmation_code: code });
}
