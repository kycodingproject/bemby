import "server-only";
import { serviceRoleClient } from "./repo/supabase";
import type { MediaRef } from "./types";
import type { MediaLoader } from "./ai/agent";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
const MAX_BYTES = 5 * 1024 * 1024;

/** Download a photo from Twilio (needs account auth) and keep a private copy in Supabase Storage. */
export async function storeTwilioMedia(businessId: string, url: string | undefined, contentType: string | undefined): Promise<MediaRef | null> {
  if (!url || !contentType || !IMAGE_TYPES.includes(contentType as (typeof IMAGE_TYPES)[number])) return null;
  const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
  const res = await fetch(url, { headers: { authorization: `Basic ${auth}` } });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) return null;
  const ext = contentType.split("/")[1];
  const path = `${businessId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await serviceRoleClient().storage.from("client-photos").upload(path, buf, { contentType });
  if (error) return null;
  return { path, content_type: contentType };
}

/** Download a photo from a public CDN link (Instagram / Messenger attachments) and keep a private copy. */
export async function storeRemoteMedia(businessId: string, url: string | undefined): Promise<MediaRef | null> {
  if (!url || !/^https:\/\//.test(url)) return null;
  const res = await fetch(url).catch(() => null);
  if (!res?.ok) return null;
  const contentType = (res.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!IMAGE_TYPES.includes(contentType as (typeof IMAGE_TYPES)[number])) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.byteLength > MAX_BYTES) return null;
  const path = `${businessId}/${crypto.randomUUID()}.${contentType.split("/")[1]}`;
  const { error } = await serviceRoleClient().storage.from("client-photos").upload(path, buf, { contentType });
  if (error) return null;
  return { path, content_type: contentType };
}

/** Give the model the actual image so it can see the client's hair, skin or reference art. */
export const loadStoredMedia: MediaLoader = async (ref) => {
  if (ref.path.startsWith("demo:")) return null;
  if (!IMAGE_TYPES.includes(ref.content_type as (typeof IMAGE_TYPES)[number])) return null;
  const { data, error } = await serviceRoleClient().storage.from("client-photos").download(ref.path);
  if (error || !data) return null;
  return {
    data: Buffer.from(await data.arrayBuffer()).toString("base64"),
    media_type: ref.content_type as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
  };
};

/** Short-lived link so the owner can view a client photo in the dashboard. */
export async function photoUrl(ref: MediaRef): Promise<string | null> {
  if (ref.path.startsWith("demo:") || ref.path.startsWith("data:")) return null;
  const { data } = await serviceRoleClient().storage.from("client-photos").createSignedUrl(ref.path, 3600);
  return data?.signedUrl ?? null;
}
