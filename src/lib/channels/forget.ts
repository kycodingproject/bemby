import "server-only";
import { serviceRoleClient } from "../repo/supabase";

/**
 * Remove a Meta account's connection from whichever business has it.
 * Called when someone removes Bemby in Instagram/Facebook settings or asks Meta to delete their data.
 * Returns how many businesses were affected.
 */
export async function forgetMetaUser(userId: string) {
  const sb = serviceRoleClient();
  let n = 0;
  // Instagram Login: user_id is the professional account ID we stored.
  const ig = await sb.from("business_channels").select("business_id").eq("instagram_user_id", userId);
  for (const row of ig.data ?? []) {
    await sb
      .from("business_channels")
      .update({ instagram_user_id: null, instagram_username: null, instagram_token: null, instagram_token_expires_at: null, updated_at: new Date().toISOString() })
      .eq("business_id", row.business_id);
    await sb.from("businesses").update({ instagram_account_id: null, instagram_username: null }).eq("id", row.business_id);
    n++;
  }
  return n;
}
