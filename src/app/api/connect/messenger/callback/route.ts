import { NextResponse, type NextRequest } from "next/server";
import { currentBusinessId } from "@/lib/repo";
import { listFacebookPages, saveChannelSecrets } from "@/lib/channels/meta";
import { linkMessengerPage } from "@/lib/channels/link";
import { baseUrl, checkOAuthState, settingsRedirect } from "@/lib/channels/connect";

export const dynamic = "force-dynamic";

/** Step 2: Facebook sends the owner back with a code; we look up their Pages. */
export async function GET(req: NextRequest) {
  const businessId = await currentBusinessId();
  const p = req.nextUrl.searchParams;
  if (p.get("error")) return NextResponse.redirect(settingsRedirect(req, { error: "Messenger connection was cancelled." }));
  if (!(await checkOAuthState("messenger", p.get("state")))) {
    return NextResponse.redirect(settingsRedirect(req, { error: "That Facebook link expired. Try connecting again." }));
  }
  try {
    const pages = await listFacebookPages(p.get("code") ?? "", `${baseUrl(req)}/api/connect/messenger/callback`);
    if (!pages.length) return NextResponse.redirect(settingsRedirect(req, { error: "No Facebook Pages found. Messenger for business needs a Facebook Page you manage." }));
    if (pages.length === 1) {
      const name = await linkMessengerPage(businessId, pages[0]);
      return NextResponse.redirect(settingsRedirect(req, { connected: `Messenger (${name})` }));
    }
    // Several Pages: keep the list server-side and let the owner choose in Settings.
    await saveChannelSecrets(businessId, { pending_pages: pages });
    return NextResponse.redirect(settingsRedirect(req, { pick: "page" }));
  } catch (e) {
    console.error("messenger connect failed", e);
    return NextResponse.redirect(settingsRedirect(req, { error: `Couldn't connect Messenger: ${(e as Error).message}` }));
  }
}
