import "server-only";
import { demoRepo, resetDemo } from "./memory";
import { DEMO_BUSINESS_ID } from "./seed";
import { SupabaseRepo, serviceRoleClient } from "./supabase";
import { ensureSupabaseDemo, resetSupabaseDemo } from "./supabase-demo";
import type { Repo } from "./types";

/** No database connected: data lives in server memory (local development only). */
export const isMemory = () => !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Sample-studio mode: the dashboard shows "Kiara Hair Studio" and nothing is texted to real phones.
 * On until owner sign-in ships.
 */
export const isDemo = () => process.env.BEMBY_DEMO !== "0";

export function getRepo(): Repo {
  if (isMemory()) return demoRepo();
  return new SupabaseRepo(serviceRoleClient());
}

/** The business the signed-in owner is looking at. */
export async function currentBusinessId(): Promise<string> {
  if (isDemo()) {
    if (!isMemory()) await ensureSupabaseDemo(serviceRoleClient());
    return DEMO_BUSINESS_ID;
  }
  throw new Error("Owner sign-in is the next milestone. Leave BEMBY_DEMO unset to use the sample studio.");
}

export async function resetSampleStudio() {
  if (isMemory()) resetDemo();
  else await resetSupabaseDemo(serviceRoleClient());
}

export type { Repo };
