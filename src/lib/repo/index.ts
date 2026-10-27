import "server-only";
import { redirect } from "next/navigation";
import { demoRepo, resetDemo } from "./memory";
import { DEMO_BUSINESS_ID } from "./seed";
import { SupabaseRepo, serviceRoleClient } from "./supabase";
import { ensureSupabaseDemo, resetSupabaseDemo } from "./supabase-demo";
import { authEnabled, currentUser } from "../auth";
import type { Repo } from "./types";

/** No database connected: data lives in server memory (local development only). */
export const isMemory = () => !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

/** Sample-studio mode: shown until real sign-in is configured. */
export const isDemo = () => !authEnabled();

export function getRepo(): Repo {
  if (isMemory()) return demoRepo();
  return new SupabaseRepo(serviceRoleClient());
}

/** The signed-in owner's business id, or the sample studio when accounts aren't set up. */
export async function currentBusinessId(): Promise<string> {
  if (isDemo()) {
    if (!isMemory()) await ensureSupabaseDemo(serviceRoleClient());
    return DEMO_BUSINESS_ID;
  }
  const user = await currentUser();
  if (!user) redirect("/login");
  const { data, error } = await serviceRoleClient().from("businesses").select("id").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle();
  if (error) throw new Error(`Supabase: ${error.message}`);
  if (!data) redirect("/onboarding");
  return data.id as string;
}

export async function resetSampleStudio() {
  if (isMemory()) resetDemo();
  else await resetSupabaseDemo(serviceRoleClient());
}

export type { Repo };
