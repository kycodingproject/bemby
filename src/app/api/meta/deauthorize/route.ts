import { NextResponse, type NextRequest } from "next/server";
import { parseSignedRequest } from "@/lib/channels/signed-request";
import { forgetMetaUser } from "@/lib/channels/forget";

export const runtime = "nodejs";

/** Meta "Deauthorize" callback: someone removed Bemby from their Instagram/Facebook settings. */
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  const data = parseSignedRequest(form ? String(form.get("signed_request") ?? "") : null);
  if (!data?.user_id) return NextResponse.json({ error: "invalid signed_request" }, { status: 400 });
  try {
    await forgetMetaUser(String(data.user_id));
  } catch (e) {
    console.error("meta deauthorize failed", e);
  }
  return NextResponse.json({ ok: true });
}
