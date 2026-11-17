import { NextResponse, type NextRequest } from "next/server";
import { currentBusinessId } from "@/lib/repo";
import { serviceRoleClient } from "@/lib/repo/supabase";
import { saveChannelSecrets } from "@/lib/channels/meta";
import { connectTikTok, registerTikTokWebhook } from "@/lib/channels/tiktok";
import { baseUrl, checkOAuthState, settingsRedirect } from "@/lib/channels/connect";

export const dynamic = "force-dynamic";

/** Step 2: TikTok sends the owner back here with a one-time code. */
export async function GET(req: NextRequest) {
  const businessId = await currentBusinessId();
  const p = req.nextUrl.searchParams;
  if (p.get("error")) return NextResponse.redirect(settingsRedirect(req, { error: "TikTok connection was cancelled." }));
  if (!(await checkOAuthState("tiktok", p.get("state")))) {
    return NextResponse.redirect(settingsRedirect(req, { error: "That TikTok link expired. Try connecting again." }));
  }
  try {
    const tt = await connectTikTok(p.get("code") ?? "", `${baseUrl(req)}/api/connect/tiktok/callback`);
    const sb = serviceRoleClient();
    const taken = await sb.from("businesses").select("id").eq("tiktok_account_id", tt.openId).neq("id", businessId).maybeSingle();
    if (taken.data) return NextResponse.redirect(settingsRedirect(req, { error: "That TikTok account is already connected to another Bemby account." }));
    await saveChannelSecrets(businessId, {
      tiktok_open_id: tt.openId, tiktok_username: tt.username, tiktok_access_token: tt.accessToken, tiktok_refresh_token: tt.refreshToken,
      tiktok_token_expires_at: tt.expiresAt, tiktok_refresh_expires_at: tt.refreshExpiresAt,
    });
    const { error } = await sb.from("businesses").update({ tiktok_account_id: tt.openId, tiktok_username: tt.username }).eq("id", businessId);
    if (error) throw new Error(`${error.message} (run supabase/migrations/0007_tiktok.sql)`);
    // Make sure TikTok delivers DMs to this site.
    await registerTikTokWebhook(`${baseUrl(req)}/api/webhooks/tiktok`).catch((e) => console.error("tiktok webhook registration failed", e));
    return NextResponse.redirect(settingsRedirect(req, { connected: `TikTok${tt.username ? ` @${tt.username}` : ""}` }));
  } catch (e) {
    console.error("tiktok connect failed", e);
    return NextResponse.redirect(settingsRedirect(req, { error: `Couldn't connect TikTok: ${(e as Error).message}` }));
  }
}
