import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

const COOKIE = "bemby_oauth_state";

export function baseUrl(req: NextRequest) {
  return (process.env.PUBLIC_BASE_URL?.trim() || req.nextUrl.origin).replace(/\/$/, "");
}

/** One-time random value tying the Meta login back to this browser (prevents forged callbacks). */
export async function newOAuthState(kind: "instagram" | "messenger") {
  const state = `${kind}.${randomBytes(24).toString("hex")}`;
  (await cookies()).set(COOKIE, state, { httpOnly: true, secure: true, sameSite: "lax", path: "/api/connect", maxAge: 600 });
  return state;
}

export async function checkOAuthState(kind: "instagram" | "messenger", given: string | null) {
  const store = await cookies();
  const expected = store.get(COOKIE)?.value ?? "";
  store.delete({ name: COOKIE, path: "/api/connect" });
  if (!given || !expected.startsWith(kind + ".") || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

export function settingsRedirect(req: NextRequest, params: Record<string, string>) {
  const u = new URL("/settings", baseUrl(req));
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v.slice(0, 300));
  u.hash = "channels";
  return u;
}
