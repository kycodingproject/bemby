import "server-only";
import { demoRepo } from "./memory";
import { DEMO_BUSINESS_ID } from "./seed";
import { SupabaseRepo, serviceRoleClient } from "./supabase";
import type { Repo } from "./types";

export const isDemo = () => !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.BEMBY_DEMO === "1";

/** Server-side data access. Falls back to the built-in demo data until Supabase keys are set. */
export function getRepo(): Repo {
  if (isDemo()) return demoRepo();
  return new SupabaseRepo(serviceRoleClient());
}

/**
 * The business the signed-in owner is looking at.
 * Demo mode: the sample studio. Real mode: wired to Supabase Auth in the next milestone.
 */
export async function currentBusinessId(): Promise<string> {
  if (isDemo()) return DEMO_BUSINESS_ID;
  throw new Error("Sign-in is not wired up yet. Set BEMBY_DEMO=1 to use demo data.");
}

export type { Repo };
