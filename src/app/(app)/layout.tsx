import { unstable_rethrow } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { currentBusinessId, getRepo, isDemo } from "@/lib/repo";
import { countNeedsYou } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let needsYou = 0;
  let businessName = "";
  try {
    const businessId = await currentBusinessId();
    const repo = getRepo();
    needsYou = await countNeedsYou(repo, businessId);
    businessName = (await repo.getBusiness(businessId))?.name ?? "";
  } catch (e) {
    unstable_rethrow(e); // let sign-in / onboarding redirects through
    // Setup problems (missing tables, wrong key) are shown plainly so they can be fixed.
    // The whole site is behind the password, so only the owner sees this.
    console.error("setup error", e);
    return <SetupProblem message={(e as Error).message} />;
  }
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar needsYou={needsYou} demo={isDemo()} businessName={businessName} />
      <main className="min-w-0 flex-1 px-4 pb-14 pt-6 md:px-10 md:pt-9">
        <div className="mx-auto max-w-[1180px]">{children}</div>
      </main>
    </div>
  );
}

function SetupProblem({ message }: { message: string }) {
  const hint = /relation|does not exist|schema cache/i.test(message)
    ? "The database tables aren't there yet. Run supabase/migrations/0001_init.sql in the Supabase SQL Editor, then reload."
    : /invalid api key|jwt|apikey|unauthorized|401/i.test(message)
      ? "Supabase rejected the key. Check that SUPABASE_SERVICE_ROLE_KEY is the secret (service_role) key, not the anon/publishable one, then redeploy."
      : /fetch failed|ENOTFOUND|getaddrinfo|invalid path/i.test(message)
        ? "The site can't reach Supabase. Check that NEXT_PUBLIC_SUPABASE_URL is your Project URL (https://xxxx.supabase.co), then redeploy."
        : "Send this message to Claude to fix it.";
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 px-4">
      <h1 className="font-display text-2xl font-bold">Bemby needs one more setup step</h1>
      <p className="text-sm leading-relaxed text-ink-2">{hint}</p>
      <pre className="whitespace-pre-wrap rounded-2xl bg-card p-4 text-[13px] text-danger shadow-[inset_0_0_0_1px_rgba(26,24,48,0.1)]">{message}</pre>
    </main>
  );
}
