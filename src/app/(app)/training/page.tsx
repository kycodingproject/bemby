import Link from "next/link";
import { currentBusinessId, getRepo } from "@/lib/repo";
import { ensureStarterQuestions } from "@/lib/training";
import { TrainingList } from "@/components/TrainingList";

export const metadata = { title: "Training · Bemby" };

/** Everything the owner has taught the receptionist, editable. */
export default async function TrainingPage() {
  const repo = getRepo();
  const business = (await repo.getBusiness(await currentBusinessId()))!;
  const name = business.assistant_name?.trim() || "your receptionist";
  let all;
  try {
    all = await ensureStarterQuestions(repo, business);
  } catch {
    return (
      <div className="card p-6 text-sm text-ink-2">
        Training isn&apos;t switched on yet. Run <code>supabase/migrations/0009_training.sql</code> in the Supabase SQL Editor, then reload.
      </div>
    );
  }
  const answered = all.filter((q) => q.status === "answered").sort((a, b) => (b.answered_at ?? "").localeCompare(a.answered_at ?? ""));
  const open = all.filter((q) => q.status === "open").sort((a, b) => (a.source === b.source ? a.sort - b.sort : a.source === "from_chat" ? -1 : 1));
  const skipped = all.filter((q) => q.status === "skipped");
  const pick = (q: (typeof all)[number]) => ({ id: q.id, question: q.question, answer: q.answer ?? "", fromChat: q.source === "from_chat" });
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link href="/" className="text-sm text-muted hover:text-ink">← Home</Link>
          <h1 className="mt-1.5 font-display text-3xl font-bold tracking-tight">What {name} knows</h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted">
            {name.charAt(0).toUpperCase() + name.slice(1)} uses these answers in every chat, along with your services, hours and policies. Edit anything, or add your own.
          </p>
        </div>
      </header>
      <TrainingList answered={answered.map(pick)} open={open.map(pick)} skipped={skipped.map(pick)} />
    </div>
  );
}
