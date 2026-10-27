import { Sidebar } from "@/components/Sidebar";
import { currentBusinessId, getRepo, isDemo } from "@/lib/repo";
import { countNeedsYou } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const repo = getRepo();
  const businessId = await currentBusinessId();
  const needsYou = await countNeedsYou(repo, businessId);
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar needsYou={needsYou} demo={isDemo()} />
      <main className="min-w-0 flex-1 px-4 pb-14 pt-6 md:px-10 md:pt-9">
        <div className="mx-auto max-w-[1180px]">{children}</div>
      </main>
    </div>
  );
}
