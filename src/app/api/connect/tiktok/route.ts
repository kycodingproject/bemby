import { NextResponse, type NextRequest } from "next/server";
import { currentBusinessId, isDemo } from "@/lib/repo";
import { tiktokAuthUrl, tiktokConfigured } from "@/lib/channels/tiktok";
import { baseUrl, newOAuthState, settingsRedirect } from "@/lib/channels/connect";

export const dynamic = "force-dynamic";

/** Step 1: send the owner to TikTok to approve Bemby. */
export async function GET(req: NextRequest) {
  if (isDemo()) return NextResponse.redirect(settingsRedirect(req, { error: "Sign in to your own account to connect TikTok." }));
  await currentBusinessId(); // must be signed in with a business
  if (!tiktokConfigured()) return NextResponse.redirect(settingsRedirect(req, { error: "TikTok isn't set up on the server yet (TIKTOK_APP_ID / TIKTOK_APP_SECRET)." }));
  const state = await newOAuthState("tiktok");
  return NextResponse.redirect(tiktokAuthUrl(state, `${baseUrl(req)}/api/connect/tiktok/callback`));
}
