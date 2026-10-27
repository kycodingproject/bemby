import "server-only";
import { serviceRoleClient } from "../repo/supabase";
import { saveChannelSecrets, subscribePage, type PageOption } from "./meta";

/** Connect one Facebook Page's Messenger to a business. Returns the Page name. */
export async function linkMessengerPage(businessId: string, page: PageOption) {
  const sb = serviceRoleClient();
  const taken = await sb.from("businesses").select("id").eq("messenger_page_id", page.id).neq("id", businessId).maybeSingle();
  if (taken.data) throw new Error(`${page.name} is already connected to another Bemby account.`);
  await subscribePage(page.id, page.access_token);
  await saveChannelSecrets(businessId, {
    messenger_page_id: page.id, messenger_page_name: page.name, messenger_page_token: page.access_token, pending_pages: null,
  });
  const { error } = await sb.from("businesses").update({ messenger_page_id: page.id, messenger_page_name: page.name }).eq("id", businessId);
  if (error) throw new Error(error.message);
  return page.name;
}
