import { NextResponse, type NextRequest } from "next/server";

/**
 * Temporary lock for the whole dashboard until real sign-in ships.
 * Set SITE_PASSWORD in Vercel. The browser asks for a username (anything) and that password.
 * Webhooks (Twilio, Meta) stay open because they verify their own signatures.
 */
export default function proxy(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password) {
    // Fail closed in production so a forgotten setting never exposes the site.
    if (process.env.VERCEL_ENV === "production" || process.env.VERCEL_ENV === "preview") {
      return new NextResponse("Set SITE_PASSWORD in your Vercel environment variables to open Bemby.", { status: 503 });
    }
    return NextResponse.next();
  }
  const header = req.headers.get("authorization") ?? "";
  if (header.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const given = decoded.slice(decoded.indexOf(":") + 1);
    if (given.length === password.length && timingSafeEqual(given, password)) return NextResponse.next();
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

export const config = {
  matcher: ["/((?!api/webhooks|_next/static|_next/image|favicon.ico|bemby-logo).*)"],
};
