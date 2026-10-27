import { NextResponse } from "next/server";
import { isMemory } from "@/lib/repo";
import { serviceRoleClient, supabaseUrl } from "@/lib/repo/supabase";
import { ensureSupabaseDemo } from "@/lib/repo/supabase-demo";

export const dynamic = "force-dynamic";

/** Setup check: which settings are present (never their values) and whether the database answers. Password-protected by the site lock. */
export async function GET() {
  const has = (k: string) => Boolean(process.env[k]?.trim());
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const status: Record<string, unknown> = {
    ANTHROPIC_API_KEY: has("ANTHROPIC_API_KEY") ? "set" : "MISSING",
    NEXT_PUBLIC_SUPABASE_URL: !url ? "MISSING" : /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url.trim()) ? "set" : `set with extra text; using ${supabaseUrl()}`,
    SUPABASE_SERVICE_ROLE_KEY: has("SUPABASE_SERVICE_ROLE_KEY") ? "set" : "MISSING",
    SITE_PASSWORD: has("SITE_PASSWORD") ? "set" : "MISSING",
    data_mode: isMemory() ? "temporary memory (database not connected)" : "Supabase database",
    vercel_environment: process.env.VERCEL_ENV ?? "local",
  };
  if (!isMemory()) {
    try {
      const sb = serviceRoleClient();
      await ensureSupabaseDemo(sb);
      const { count, error } = await sb.from("businesses").select("id", { count: "exact", head: true });
      status.database = error ? `error: ${error.message}` : `connected, ${count} business row(s)`;
    } catch (e) {
      status.database = `error: ${(e as Error).message}`;
    }
  }
  return NextResponse.json(status, { headers: { "cache-control": "no-store" } });
}
