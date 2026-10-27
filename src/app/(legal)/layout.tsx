import Image from "next/image";
import Link from "next/link";
import { LEGAL } from "@/lib/legal";

/** Public pages (no sign-in, no site password) for legal text Meta, Twilio and clients need to reach. */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh px-4 py-10">
      <header className="mx-auto flex max-w-3xl items-center justify-between gap-4">
        <Link href="/login" className="flex items-center gap-2.5">
          <Image src="/bemby-logo.png" alt="" width={30} height={31} />
          <span className="font-display text-xl font-bold tracking-tight">bemby</span>
        </Link>
        <nav aria-label="Legal" className="flex flex-wrap gap-4 text-sm text-muted">
          <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          <Link href="/terms" className="hover:text-ink">Terms</Link>
          <Link href="/data-deletion" className="hover:text-ink">Data deletion</Link>
        </nav>
      </header>
      <main className="card mx-auto mt-8 max-w-3xl p-6 md:p-10">
        <article className="legal">{children}</article>
      </main>
      <footer className="mx-auto mt-6 max-w-3xl text-center text-xs text-muted">
        © {new Date().getFullYear()} {LEGAL.operator} · Questions: {LEGAL.contactEmail}
      </footer>
    </div>
  );
}
