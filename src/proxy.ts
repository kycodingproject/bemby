import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_PATHS = ["/login", "/signup"];

/**
 * 1. Optional site-wide password (SITE_PASSWORD) while Bemby is in private testing.
 * 2. Keeps the owner's Supabase sign-in fresh and sends signed-out visitors to /login.
 * Webhooks (Twilio, Meta) are excluded by the matcher; they verify their own signatures.
 */
export default async function proxy(req: NextRequest) {
  const url = supabaseUrlFromEnv();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const accounts = Boolean(url && anon && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

  // Without accounts the sample studio is open to anyone with the link, so require the site password online.
  if (!accounts && !process.env.SITE_PASSWORD && (process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview")) {
    return new NextResponse("Set SITE_PASSWORD (or connect Supabase sign-in) in Vercel to open Bemby.", { status: 503 });
  }
  const locked = sitePassword(req);
  if (locked) return locked;
  if (!accounts || !url || !anon) return NextResponse.next(); // sample studio mode

  let res = NextResponse.next({ request: req });
  const sb = createServerClient(url, anon, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => req.cookies.set(name, value));
        res = NextResponse.next({ request: req });
        list.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await sb.auth.getUser();
  const path = req.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + "/"));
  if (!data.user && !isPublic && !path.startsWith("/api/")) {
    const to = req.nextUrl.clone();
    to.pathname = "/login";
    to.search = "";
    return NextResponse.redirect(to);
  }
  if (data.user && isPublic) {
    const to = req.nextUrl.clone();
    to.pathname = "/";
    to.search = "";
    return NextResponse.redirect(to);
  }
  return res;
}

function sitePassword(req: NextRequest): NextResponse | null {
  const password = process.env.SITE_PASSWORD;
  if (!password) return null;
  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const given = decoded.slice(decoded.indexOf(":") + 1);
    if (given.length === password.length && timingSafeEqual(given, password)) return null;
  }
  return new NextResponse("Password required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Bemby", charset="UTF-8"' },
  });
}

function timingSafeEqual(a: string, b: string) {
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function supabaseUrlFromEnv() {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return undefined;
  const dash = raw.match(/supabase\.com\/dashboard\/project\/([a-z0-9]+)/i);
  if (dash) return `https://${dash[1]}.supabase.co`;
  const proj = raw.match(/^(?:https?:\/\/)?([a-z0-9-]+)\.supabase\.co/i);
  return proj ? `https://${proj[1]}.supabase.co` : raw;
}

export const config = {
  matcher: ["/((?!api/webhooks|_next/static|_next/image|favicon.ico|bemby-logo).*)"],
};
