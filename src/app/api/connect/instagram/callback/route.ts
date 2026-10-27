import { NextResponse, type NextRequest } from "next/server";
import { currentBusinessId } from "@/lib/repo";
import { serviceRoleClient } from "@/lib/repo/supabase";
import { connectInstagram, saveChannelSecrets } from "@/lib/channels/meta";
import { baseUrl, checkOAuthState, settingsRedirect } from "@/lib/channels/connect";

export const dynamic = "force-dynamic";

/** Step 2: Instagram sends the owner back here with a one-time code. */
export async function GET(req: NextRequest) {
  const businessId = await currentBusinessId();
  const p = req.nextUrl.searchParams;
  if (p.get("error")) return NextResponse.redirect(settingsRedirect(req, { error: "Instagram connection was cancelled." }));
  if (!(await checkOAuthState("instagram", p.get("state")))) {
    return NextResponse.redirect(settingsRedirect(req, { error: "That Instagram link expired. Try connecting again." }));
  }
  try {
    const ig = await connectInstagram(p.get("code") ?? "", `${baseUrl(req)}/api/connect/instagram/callback`);
    const sb = serviceRoleClient();
    const taken = await sb.from("businesses").select("id").eq("instagram_account_id", ig.userId).neq("id", businessId).maybeSingle();
    if (taken.data) return NextResponse.redirect(settingsRedirect(req, { error: `@${ig.username} is already connected to another Bemby account.` }));
    await saveChannelSecrets(businessId, {
      instagram_user_id: ig.userId, instagram_username: ig.username, instagram_token: ig.token, instagram_token_expires_at: ig.expiresAt,
    });
    const { error } = await sb.from("businesses").update({ instagram_account_id: ig.userId, instagram_username: ig.username }).eq("id", businessId);
    if (error) throw new Error(error.message);
    return NextResponse.redirect(settingsRedirect(req, { connected: `Instagram @${ig.username}` }));
  } catch (e) {
    console.error("instagram connect failed", e);
    return NextResponse.redirect(settingsRedirect(req, { error: `Couldn't connect Instagram: ${(e as Error).message}` }));
  }
}
