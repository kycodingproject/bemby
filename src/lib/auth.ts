import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseUrl } from "./repo/supabase";

/** Real accounts turn on once the database and the public (anon / publishable) key are set. */
export const authEnabled = () =>
  Boolean(supabaseUrl() && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());

/** Supabase client acting as the signed-in owner (reads their session cookie). */
export async function authClient() {
  const store = await cookies();
  return createServerClient(supabaseUrl()!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(), {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Called from a Server Component: the proxy refreshes the session instead.
        }
      },
    },
  });
}

export async function currentUser() {
  if (!authEnabled()) return null;
  const sb = await authClient();
  const { data } = await sb.auth.getUser();
  return data.user ?? null;
}
