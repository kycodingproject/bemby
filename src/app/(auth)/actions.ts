"use server";

import { redirect } from "next/navigation";
import { authClient, authEnabled } from "@/lib/auth";

export type AuthState = { error?: string; info?: string } | undefined;

function friendly(message: string) {
  if (/invalid login credentials/i.test(message)) return "That email and password don't match. Try again or create an account.";
  if (/already registered|already been registered/i.test(message)) return "There's already an account with that email. Sign in instead.";
  if (/email not confirmed/i.test(message)) return "Check your email and tap the confirmation link first.";
  if (/rate limit/i.test(message)) return "Too many tries. Wait a minute and try again.";
  return message;
}

export async function signUp(_: AuthState, form: FormData): Promise<AuthState> {
  if (!authEnabled()) return { error: "Sign-up isn't turned on yet." };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter a valid email." };
  if (password.length < 8) return { error: "Use at least 8 characters for your password." };
  const sb = await authClient();
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) return { error: friendly(error.message) };
  if (!data.session) return { info: "Almost there! Check your email and tap the link to confirm, then sign in." };
  redirect("/onboarding");
}

export async function signIn(_: AuthState, form: FormData): Promise<AuthState> {
  if (!authEnabled()) return { error: "Sign-in isn't turned on yet." };
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const password = String(form.get("password") ?? "");
  const sb = await authClient();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { error: friendly(error.message) };
  redirect("/");
}

export async function signOut() {
  if (authEnabled()) {
    const sb = await authClient();
    await sb.auth.signOut();
  }
  redirect("/login");
}
