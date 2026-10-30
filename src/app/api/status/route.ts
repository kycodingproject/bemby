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
    NEXT_PUBLIC_SUPABASE_ANON_KEY: has("NEXT_PUBLIC_SUPABASE_ANON_KEY") ? "set" : "MISSING (sign-in is off)",
    STRIPE_SECRET_KEY: !has("STRIPE_SECRET_KEY") ? "MISSING (payments are off)" : process.env.STRIPE_SECRET_KEY!.trim().startsWith("sk_") ? `set (${process.env.STRIPE_SECRET_KEY!.trim().startsWith("sk_live_") ? "live" : "test"} mode)` : "set, but doesn't start with sk_ (use the Secret key, not the Publishable key)",
    STRIPE_WEBHOOK_SECRET: !has("STRIPE_WEBHOOK_SECRET") ? "MISSING" : process.env.STRIPE_WEBHOOK_SECRET!.trim().startsWith("whsec_") ? "set" : "set, but doesn't start with whsec_",
    META_APP_ID: has("META_APP_ID") ? "set" : "MISSING",
    INSTAGRAM_APP_ID: has("INSTAGRAM_APP_ID") ? "set" : "MISSING",
    data_mode: isMemory() ? "temporary memory (database not connected)" : "Supabase database",
    vercel_environment: process.env.VERCEL_ENV ?? "local",
  };
  if (!isMemory()) {
    try {
      const sb = serviceRoleClient();
      await ensureSupabaseDemo(sb);
      const { count, error } = await sb.from("businesses").select("id", { count: "exact", head: true });
      status.database = error ? `error: ${error.message}` : `connected, ${count} business row(s)`;
      const m2 = await sb.from("businesses").select("texting_status").limit(1);
      status.migration_0002 = m2.error ? "NOT RUN (run 0002_channels.sql)" : "done";
      const m3 = await sb.from("businesses").select("subscription_status").limit(1);
      status.migration_0003 = m3.error ? "NOT RUN (run 0003_billing.sql)" : "done";
      const m4 = await sb.from("businesses").select("reply_delay_seconds").limit(1);
      status.migration_0004 = m4.error ? "NOT RUN (run 0004_reply_delay.sql)" : "done";
      const m5 = await sb.from("businesses").select("trigger_words").limit(1);
      status.migration_0005 = m5.error ? "NOT RUN (run 0005_trigger_words.sql)" : "done";
      const m6 = await sb.from("businesses").select("assistant_name").limit(1);
      status.migration_0006 = m6.error ? "NOT RUN (run 0006_receptionist.sql)" : "done";
    } catch (e) {
      status.database = `error: ${(e as Error).message}`;
    }
  }
  return NextResponse.json(status, { headers: { "cache-control": "no-store" } });
}
