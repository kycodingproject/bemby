"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import { NavIcon } from "./icons";

const LINKS = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/inbox", label: "Inbox", icon: "inbox" },
  { href: "/calendar", label: "Calendar", icon: "calendar" },
  { href: "/specials", label: "Specials", icon: "specials" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

export function Sidebar({ needsYou, demo, businessName }: { needsYou: number; demo: boolean; businessName: string }) {
  const path = usePathname();
  return (
    <aside className="side-glass sticky top-0 z-30 w-full shrink-0 border-b border-white/70 px-4 py-4 shadow-[0_8px_30px_-18px_rgba(76,50,180,0.35)] md:flex md:h-dvh md:w-60 md:flex-col md:border-b-0 md:border-r md:px-4 md:py-7">
      <div className="flex items-center gap-2.5 px-2">
        <Image src="/bemby-logo.png" alt="" width={32} height={33} className="drop-shadow-[0_6px_12px_rgba(106,75,245,0.45)]" priority />
        <span className="font-display text-xl font-bold tracking-tight">bemby</span>
        {demo && <span className="ml-auto rounded-full bg-warn-chip px-2 py-0.5 text-[11px] font-semibold text-[#7a3f05]">Demo</span>}
      </div>
      {businessName && <p className="mt-1 hidden truncate px-2 text-[13px] text-muted md:block">{businessName}</p>}
      <nav aria-label="Main" className="mt-4 flex gap-1 overflow-x-auto md:mt-7 md:flex-col">
        {LINKS.map((l) => {
          const on = l.href === "/" ? path === "/" : path.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={on ? "page" : undefined}
              className={`flex min-h-11 shrink-0 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-colors ${
                on ? "nav-on" : "text-ink-2 hover:bg-white/80 hover:text-ink"
              }`}
            >
              <NavIcon name={l.icon} />
              {l.label}
              {l.href === "/inbox" && needsYou > 0 && (
                <span className={`ml-auto rounded-full px-2 text-xs font-bold ${on ? "bg-white/25 text-white" : "bg-[#ff8a3d] text-white"}`}>{needsYou}</span>
              )}
            </Link>
          );
        })}
      </nav>
      {!demo && (
        <form action={signOut} className="mt-2 md:mt-auto md:pt-6">
          <button className="min-h-11 rounded-xl px-3.5 text-sm text-muted hover:bg-hover hover:text-ink">Sign out</button>
        </form>
      )}
    </aside>
  );
}
