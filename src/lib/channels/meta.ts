import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serviceRoleClient } from "../repo/supabase";

const GRAPH_VERSION = process.env.META_GRAPH_VERSION ?? "v25.0";
const IG_GRAPH = `https://graph.instagram.com/${GRAPH_VERSION}`;
const FB_GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;

export const INSTAGRAM_SCOPES = ["instagram_business_basic", "instagram_business_manage_messages"];
export const MESSENGER_SCOPES = ["pages_show_list", "pages_messaging", "pages_manage_metadata"];

const env = (k: string) => process.env[k]?.trim() || "";
export const instagramConfigured = () => Boolean(env("INSTAGRAM_APP_ID") && env("INSTAGRAM_APP_SECRET"));
export const messengerConfigured = () => Boolean(env("META_APP_ID") && env("META_APP_SECRET"));

async function json<T>(res: Response): Promise<T> {
  const body = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } | string; error_message?: string };
  if (!res.ok || (body && typeof body === "object" && "error" in body && body.error)) {
    const err = body?.error;
    const msg = typeof err === "string" ? err : err?.message ?? body?.error_message ?? `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body;
}

// ---------- Instagram (Business Login for Instagram; no Facebook Page needed) ----------

export function instagramAuthUrl(state: string, redirectUri: string) {
  const u = new URL("https://www.instagram.com/oauth/authorize");
  u.searchParams.set("client_id", env("INSTAGRAM_APP_ID"));
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", INSTAGRAM_SCOPES.join(","));
  u.searchParams.set("state", state);
  return u.toString();
}

export async function connectInstagram(code: string, redirectUri: string) {
  const form = new URLSearchParams({
    client_id: env("INSTAGRAM_APP_ID"),
    client_secret: env("INSTAGRAM_APP_SECRET"),
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code: code.replace(/#_$/, ""),
  });
  const short = await json<{ data?: { access_token: string }[]; access_token?: string }>(
    await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body: form }),
  );
  const shortToken = short.data?.[0]?.access_token ?? short.access_token;
  if (!shortToken) throw new Error("Instagram didn't return an access token");

  const long = await json<{ access_token: string; expires_in: number }>(
    await fetch(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${encodeURIComponent(env("INSTAGRAM_APP_SECRET"))}&access_token=${encodeURIComponent(shortToken)}`),
  );
  // user_id here is the professional account ID that webhooks use as entry.id / recipient.id
  const me = await json<{ user_id: string; username: string }>(
    await fetch(`${IG_GRAPH}/me?fields=user_id,username&access_token=${encodeURIComponent(long.access_token)}`),
  );
  await json(await fetch(`${IG_GRAPH}/me/subscribed_apps?subscribed_fields=messages&access_token=${encodeURIComponent(long.access_token)}`, { method: "POST" }));
  return {
    userId: String(me.user_id),
    username: me.username,
    token: long.access_token,
    expiresAt: new Date(Date.now() + long.expires_in * 1000).toISOString(),
  };
}

/** Instagram tokens last 60 days; refresh any that are more than a day old. */
export async function refreshInstagramToken(token: string) {
  const r = await json<{ access_token: string; expires_in: number }>(
    await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`),
  );
  return { token: r.access_token, expiresAt: new Date(Date.now() + r.expires_in * 1000).toISOString() };
}

// ---------- Messenger (Facebook Login -> Page access token) ----------

export function facebookAuthUrl(state: string, redirectUri: string) {
  const u = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
  u.searchParams.set("client_id", env("META_APP_ID"));
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("state", state);
  u.searchParams.set("scope", MESSENGER_SCOPES.join(","));
  u.searchParams.set("response_type", "code");
  return u.toString();
}

export interface PageOption {
  id: string;
  name: string;
  access_token: string;
}

export async function listFacebookPages(code: string, redirectUri: string): Promise<PageOption[]> {
  const q = (p: Record<string, string>) => new URLSearchParams(p).toString();
  const short = await json<{ access_token: string }>(
    await fetch(`${FB_GRAPH}/oauth/access_token?${q({ client_id: env("META_APP_ID"), client_secret: env("META_APP_SECRET"), redirect_uri: redirectUri, code })}`),
  );
  // A long-lived user token gives Page tokens that don't expire.
  const long = await json<{ access_token: string }>(
    await fetch(`${FB_GRAPH}/oauth/access_token?${q({ grant_type: "fb_exchange_token", client_id: env("META_APP_ID"), client_secret: env("META_APP_SECRET"), fb_exchange_token: short.access_token })}`),
  );
  const pages = await json<{ data: PageOption[] }>(await fetch(`${FB_GRAPH}/me/accounts?fields=id,name,access_token&limit=50&access_token=${encodeURIComponent(long.access_token)}`));
  return pages.data ?? [];
}

export async function subscribePage(pageId: string, pageToken: string) {
  await json(await fetch(`${FB_GRAPH}/${pageId}/subscribed_apps?subscribed_fields=messages&access_token=${encodeURIComponent(pageToken)}`, { method: "POST" }));
}

// ---------- Sending ----------

/**
 * Meta lets businesses reply freely within 24 hours of the client's last message.
 * Later replies need the HUMAN_AGENT tag (up to 7 days), which requires Meta's approval for the app.
 */
export async function sendInstagramText(opts: { igUserId: string; token: string; to: string; text: string; humanAgent?: boolean }) {
  const body: Record<string, unknown> = { recipient: { id: opts.to }, message: { text: truncateBytes(opts.text, 1000) } };
  if (opts.humanAgent) Object.assign(body, { messaging_type: "MESSAGE_TAG", tag: "HUMAN_AGENT" });
  const r = await json<{ message_id: string }>(
    await fetch(`${IG_GRAPH}/${opts.igUserId}/messages`, {
      method: "POST",
      headers: { authorization: `Bearer ${opts.token}`, "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  return r.message_id;
}

export async function sendMessengerText(opts: { pageToken: string; to: string; text: string; humanAgent?: boolean }) {
  const body: Record<string, unknown> = {
    recipient: { id: opts.to },
    message: { text: opts.text.slice(0, 2000) },
    messaging_type: opts.humanAgent ? "MESSAGE_TAG" : "RESPONSE",
    ...(opts.humanAgent ? { tag: "HUMAN_AGENT" } : {}),
  };
  const r = await json<{ message_id: string }>(
    await fetch(`${FB_GRAPH}/me/messages?access_token=${encodeURIComponent(opts.pageToken)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  return r.message_id;
}

function truncateBytes(s: string, max: number) {
  const enc = new TextEncoder();
  if (enc.encode(s).length <= max) return s;
  let out = s;
  while (enc.encode(out + "…").length > max) out = out.slice(0, -1);
  return out + "…";
}

// ---------- Webhook signature ----------

/** Meta signs webhook bodies with the app secret (X-Hub-Signature-256: sha256=<hex>). */
export function validMetaSignature(rawBody: string, header: string | null) {
  if (!header?.startsWith("sha256=")) return false;
  const given = Buffer.from(header.slice(7), "hex");
  for (const secret of [env("META_APP_SECRET"), env("INSTAGRAM_APP_SECRET")].filter(Boolean)) {
    const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
    if (expected.length === given.length && timingSafeEqual(expected, given)) return true;
  }
  return false;
}

// ---------- Stored connection secrets (server only) ----------

export interface ChannelSecrets {
  business_id: string;
  instagram_user_id: string | null;
  instagram_username: string | null;
  instagram_token: string | null;
  instagram_token_expires_at: string | null;
  messenger_page_id: string | null;
  messenger_page_name: string | null;
  messenger_page_token: string | null;
  pending_pages: PageOption[] | null;
}

export async function getChannelSecrets(businessId: string): Promise<ChannelSecrets | null> {
  const { data, error } = await serviceRoleClient().from("business_channels").select("*").eq("business_id", businessId).maybeSingle();
  if (error) throw new Error(`${error.message} (run supabase/migrations/0002_channels.sql)`);
  return data as ChannelSecrets | null;
}

export async function saveChannelSecrets(businessId: string, patch: Partial<ChannelSecrets>) {
  const { error } = await serviceRoleClient()
    .from("business_channels")
    .upsert({ business_id: businessId, ...patch, updated_at: new Date().toISOString() }, { onConflict: "business_id" });
  if (error) throw new Error(`${error.message} (run supabase/migrations/0002_channels.sql)`);
}
