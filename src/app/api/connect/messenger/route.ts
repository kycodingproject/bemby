import { NextResponse, type NextRequest } from "next/server";
import { currentBusinessId, isDemo } from "@/lib/repo";
import { facebookAuthUrl, messengerConfigured } from "@/lib/channels/meta";
import { baseUrl, newOAuthState, settingsRedirect } from "@/lib/channels/connect";

export const dynamic = "force-dynamic";

/** Step 1: send the owner to Facebook to pick the Page whose Messenger Bemby should answer. */
export async function GET(req: NextRequest) {
  if (isDemo()) return NextResponse.redirect(settingsRedirect(req, { error: "Sign in to your own account to connect Messenger." }));
  await currentBusinessId();
  if (!messengerConfigured()) return NextResponse.redirect(settingsRedirect(req, { error: "Messenger isn't set up on the server yet (META_APP_ID / META_APP_SECRET)." }));
  const state = await newOAuthState("messenger");
  return NextResponse.redirect(facebookAuthUrl(state, `${baseUrl(req)}/api/connect/messenger/callback`));
}
