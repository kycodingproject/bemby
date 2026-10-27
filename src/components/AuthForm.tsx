"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState } from "react";
import type { AuthState } from "@/app/(auth)/actions";

export function AuthForm(props: {
  mode: "login" | "signup";
  action: (state: AuthState, form: FormData) => Promise<AuthState>;
}) {
  const [state, formAction, pending] = useActionState(props.action, undefined);
  const signup = props.mode === "signup";
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-7 px-4 py-12">
      <div className="flex items-center gap-2.5">
        <Image src="/bemby-logo.png" alt="" width={36} height={37} className="drop-shadow-[0_6px_12px_rgba(106,75,245,0.35)]" priority />
        <span className="font-display text-2xl font-bold tracking-tight">bemby</span>
      </div>
      <section className="card w-full max-w-md p-8">
        <h1 className="font-display text-2xl font-bold tracking-tight">{signup ? "Create your account" : "Welcome back"}</h1>
        <p className="mt-2 text-sm text-muted">
          {signup ? "Your AI receptionist, set up in about 5 minutes. First month just $4.99." : "Sign in to see your inbox and calendar."}
        </p>
        <form action={formAction} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-[13px] text-muted">
            Email
            <input className="input" name="email" type="email" autoComplete="email" required />
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] text-muted">
            Password
            <input className="input" name="password" type="password" autoComplete={signup ? "new-password" : "current-password"} minLength={8} required />
          </label>
          {state?.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
          {state?.info && <p role="status" className="text-sm text-ok">{state.info}</p>}
          <button className="btn btn-primary mt-1" disabled={pending}>{pending ? "One sec…" : signup ? "Create account" : "Sign in"}</button>
        </form>
        <p className="mt-5 text-center text-sm text-muted">
          {signup ? "Already have an account? " : "New to Bemby? "}
          <Link href={signup ? "/login" : "/signup"} className="font-semibold text-brand-ink underline">
            {signup ? "Sign in" : "Create an account"}
          </Link>
        </p>
      </section>
    </main>
  );
}
