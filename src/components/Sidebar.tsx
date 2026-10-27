"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS: Record<string, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  inbox: <path d="M4 5h16v11H9l-5 4z" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  specials: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />,
  settings: (
    <>
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="10" cy="17" r="2" />
    </>
  ),
};

const LINKS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/inbox", label: "Inbox", icon: "inbox" },
  { href: "/calendar", label: "Calendar", icon: "calendar" },
  { href: "/specials", label: "Specials", icon: "specials" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function Sidebar({ needsYou, demo }: { needsYou: number; demo: boolean }) {
  const path = usePathname();
  return (
    <aside className="w-full shrink-0 border-b border-line bg-card px-4 py-4 md:sticky md:top-0 md:h-dvh md:w-60 md:border-b-0 md:border-r md:px-4 md:py-7">
      <div className="flex items-center gap-2.5 px-2">
        <Image src="/bemby-logo.png" alt="" width={30} height={31} className="drop-shadow-[0_4px_8px_rgba(106,75,245,0.35)]" priority />
        <span className="font-display text-xl font-bold tracking-tight">bemby</span>
        {demo && <span className="ml-auto rounded-full bg-warn-chip px-2 py-0.5 text-[11px] font-semibold text-[#7a3f05]">Demo</span>}
      </div>
      <nav aria-label="Main" className="mt-4 flex gap-1 overflow-x-auto md:mt-7 md:flex-col">
        {LINKS.map((l) => {
          const on = l.href === "/" ? path === "/" : path.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={on ? "page" : undefined}
              className={`flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3.5 text-sm font-medium ${
                on ? "bg-brand-soft text-ink shadow-[inset_0_0_0_1px_rgba(106,75,245,0.35)]" : "text-muted hover:bg-hover hover:text-ink"
              }`}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden="true">
                {ICONS[l.icon]}
              </svg>
              {l.label}
              {l.href === "/inbox" && needsYou > 0 && (
                <span className="ml-auto rounded-full bg-warn-chip px-2 text-xs font-semibold text-warn">{needsYou}</span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
