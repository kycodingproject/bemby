import { NextResponse, type NextRequest } from "next/server";
import { currentBusinessId, isDemo } from "@/lib/repo";
import { instagramAuthUrl, instagramConfigured } from "@/lib/channels/meta";
import { baseUrl, newOAuthState, settingsRedirect } from "@/lib/channels/connect";

export const dynamic = "force-dynamic";

/** Step 1: send the owner to Instagram to approve Bemby. */
export async function GET(req: NextRequest) {
  if (isDemo()) return NextResponse.redirect(settingsRedirect(req, { error: "Sign in to your own account to connect Instagram." }));
  await currentBusinessId(); // must be signed in with a business
  if (!instagramConfigured()) return NextResponse.redirect(settingsRedirect(req, { error: "Instagram isn't set up on the server yet (INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET)." }));
  const state = await newOAuthState("instagram");
  return NextResponse.redirect(instagramAuthUrl(state, `${baseUrl(req)}/api/connect/instagram/callback`));
}
