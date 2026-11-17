import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getChannelSecrets, saveChannelSecrets } from "./meta";

/**
 * TikTok Business Messaging API (business-api.tiktok.com). Needs TikTok's approval for the app,
 * and only works for TikTok Business accounts outside the EEA, Switzerland and the UK.
 */
const API = `https://business-api.tiktok.com/open_api/${process.env.TIKTOK_API_VERSION?.trim() || "v1.3"}`;

export const TIKTOK_SCOPES = [
  "user.info.basic", "user.info.username", "user.info.stats", "user.info.profile", "user.account.type", "user.insights",
  "message.list.read", "message.list.send", "message.list.manage",
];

const env = (k: string) => process.env[k]?.trim() || "";
export const tiktokConfigured = () => Boolean(env("TIKTOK_APP_ID") && env("TIKTOK_APP_SECRET"));

/** TikTok answers 200 with { code, message, data }; code 0 means success. */
async function call<T>(res: Response, what: string): Promise<T> {
  const body = (await res.json().catch(() => null)) as { code?: number; message?: string; data?: T } | null;
  if (!res.ok || !body || body.code !== 0) throw new Error(`${what}: ${body?.message ?? `HTTP ${res.status}`}`);
  return body.data as T;
}
const jsonHeaders = (token?: string) => ({ "content-type": "application/json", accept: "application/json", ...(token ? { "Access-Token": token } : {}) });

// ---------- Sign-in ----------

export function tiktokAuthUrl(state: string, redirectUri: string) {
  const u = new URL("https://www.tiktok.com/v2/auth/authorize");
  u.searchParams.set("client_key", env("TIKTOK_APP_ID"));
  u.searchParams.set("response_type", "code");
  u.searchParams.set("scope", TIKTOK_SCOPES.join(","));
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("state", state);
  return u.toString();
}

interface TokenData { open_id?: string; scope?: string; access_token: string; refresh_token: string; expires_in: number; refresh_token_expires_in: number }
const expiry = (seconds: number) => new Date(Date.now() + seconds * 1000).toISOString();

export async function connectTikTok(code: string, redirectUri: string) {
  const t = await call<TokenData>(
    await fetch(`${API}/tt_user/oauth2/token/`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ client_id: env("TIKTOK_APP_ID"), client_secret: env("TIKTOK_APP_SECRET"), grant_type: "authorization_code", auth_code: code, redirect_uri: redirectUri }),
    }),
    "TikTok sign-in failed",
  );
  if (!t.open_id) throw new Error("TikTok didn't return an account id");
  const granted = (t.scope ?? "").split(",");
  if (!granted.includes("message.list.read") || !granted.includes("message.list.send")) throw new Error("Bemby needs permission to read and send messages. Try again and leave every box ticked.");
  let username = "";
  try {
    const q = new URLSearchParams({ business_id: t.open_id, fields: JSON.stringify(["username", "display_name"]) });
    const me = await call<{ username?: string; display_name?: string }>(await fetch(`${API}/business/get/?${q}`, { headers: { "Access-Token": t.access_token } }), "TikTok profile");
    username = me.username ?? me.display_name ?? "";
  } catch (e) {
    console.error("tiktok profile lookup failed", e);
  }
  return {
    openId: t.open_id, username, accessToken: t.access_token, refreshToken: t.refresh_token,
    expiresAt: expiry(t.expires_in), refreshExpiresAt: expiry(t.refresh_token_expires_in),
  };
}

/** Tell TikTok where to deliver DMs for this app (one setting for the whole app; safe to repeat). */
export async function registerTikTokWebhook(callbackUrl: string) {
  await call(
    await fetch(`${API}/business/webhook/update/`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ app_id: env("TIKTOK_APP_ID"), secret: env("TIKTOK_APP_SECRET"), event_type: "DIRECT_MESSAGE", callback_url: callbackUrl }),
    }),
    "Couldn't set the TikTok webhook",
  );
}

/** Access tokens last about a day; swap in a fresh one when it's close to expiring. */
export async function tiktokToken(businessId: string): Promise<{ token: string; openId: string }> {
  const s = await getChannelSecrets(businessId);
  if (!s?.tiktok_access_token || !s.tiktok_open_id) throw new Error("TikTok isn't connected. Reconnect it in Settings.");
  const left = s.tiktok_token_expires_at ? new Date(s.tiktok_token_expires_at).getTime() - Date.now() : 0;
  if (left > 5 * 60_000) return { token: s.tiktok_access_token, openId: s.tiktok_open_id };
  if (!s.tiktok_refresh_token || (s.tiktok_refresh_expires_at && new Date(s.tiktok_refresh_expires_at).getTime() < Date.now())) {
    throw new Error("TikTok needs to be reconnected in Settings (the connection expired).");
  }
  const t = await call<TokenData>(
    await fetch(`${API}/tt_user/oauth2/refresh_token/`, {
      method: "POST",
      headers: jsonHeaders(),
      body: JSON.stringify({ client_id: env("TIKTOK_APP_ID"), client_secret: env("TIKTOK_APP_SECRET"), grant_type: "refresh_token", refresh_token: s.tiktok_refresh_token }),
    }),
    "TikTok token refresh failed",
  );
  await saveChannelSecrets(businessId, {
    tiktok_access_token: t.access_token, tiktok_refresh_token: t.refresh_token,
    tiktok_token_expires_at: expiry(t.expires_in), tiktok_refresh_expires_at: expiry(t.refresh_token_expires_in),
  });
  return { token: t.access_token, openId: s.tiktok_open_id };
}

// ---------- Messages ----------

/** Replies are only allowed within 48 hours of the client's last message. US accounts can send text only. */
export async function sendTikTokText(opts: { businessId: string; conversationId: string; text: string }) {
  const { token, openId } = await tiktokToken(opts.businessId);
  const r = await call<{ message?: { message_id?: string } }>(
    await fetch(`${API}/business/message/send/`, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ business_id: openId, recipient_type: "CONVERSATION", recipient: opts.conversationId, message_type: "TEXT", text: { body: opts.text.slice(0, 2000) } }),
    }),
    "TikTok didn't accept the message",
  );
  return r.message?.message_id ?? "";
}

/** A short-lived link to a photo the client sent, plus the header TikTok wants on the download. */
export async function tiktokImageLink(opts: { businessId: string; conversationId: string; messageId: string; mediaId: string }) {
  const { token, openId } = await tiktokToken(opts.businessId);
  const r = await call<{ download_url?: string }>(
    await fetch(`${API}/business/message/media/download/`, {
      method: "POST",
      headers: jsonHeaders(token),
      body: JSON.stringify({ business_id: openId, conversation_id: opts.conversationId, message_id: opts.messageId, media_id: opts.mediaId, media_type: "IMAGE" }),
    }),
    "TikTok photo",
  );
  return r.download_url ? { url: r.download_url, headers: { "x-user": token } } : null;
}

// ---------- Webhook signature ----------

/** Header looks like "t=1700000000,s=<hex>"; s = HMAC-SHA256(app secret, `${t}.${body}`). */
export function validTikTokSignature(rawBody: string, header: string | null) {
  const secret = env("TIKTOK_APP_SECRET");
  if (!secret || !header) return false;
  const parts = Object.fromEntries(header.split(",").map((kv) => kv.trim().split("=") as [string, string]));
  const t = Number(parts.t);
  if (!t || !parts.s) return false;
  if (Math.abs(Date.now() / 1000 - t) > 300) return false; // stale or replayed
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`, "utf8").digest();
  const given = Buffer.from(parts.s, "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}
