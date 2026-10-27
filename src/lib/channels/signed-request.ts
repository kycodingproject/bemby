import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Meta's signed_request (sent to deauthorize and data-deletion callbacks):
 * "<base64url signature>.<base64url JSON payload>", signed with HMAC-SHA256 using the app secret.
 */
export function parseSignedRequest(signed: string | null): { user_id?: string; [k: string]: unknown } | null {
  if (!signed || !signed.includes(".")) return null;
  const [sig, payload] = signed.split(".", 2);
  const given = Buffer.from(sig.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  for (const secret of [process.env.META_APP_SECRET, process.env.INSTAGRAM_APP_SECRET].map((s) => s?.trim()).filter(Boolean) as string[]) {
    const expected = createHmac("sha256", secret).update(payload).digest();
    if (expected.length === given.length && timingSafeEqual(expected, given)) {
      try {
        return JSON.parse(Buffer.from(payload.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
      } catch {
        return null;
      }
    }
  }
  return null;
}
