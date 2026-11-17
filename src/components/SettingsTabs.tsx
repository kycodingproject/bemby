"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

import { SETTINGS_TABS, type SettingsTab } from "@/lib/settings-tabs";

/** One tab per Settings card. Plain links, so each tab has its own address (e.g. /settings?tab=calendar). */
export function SettingsTabs({ active }: { active: SettingsTab }) {
  const bar = useRef<HTMLElement>(null);
  // On phones the bar scrolls sideways: keep the selected tab in view.
  useEffect(() => {
    const el = bar.current;
    const on = el?.querySelector<HTMLElement>('[aria-current="page"]');
    if (el && on) el.scrollTo({ left: on.offsetLeft - el.clientWidth / 2 + on.clientWidth / 2, behavior: "smooth" });
  }, [active]);
  return (
    <nav ref={bar} aria-label="Settings sections" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
      <ul className="flex w-max gap-1.5 rounded-2xl bg-card p-1.5 shadow-[inset_0_0_0_1px_rgba(26,24,48,0.08)]">
        {SETTINGS_TABS.map((t) => {
          const on = t.id === active;
          return (
            <li key={t.id}>
              <Link
                href={`/settings?tab=${t.id}`}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className={`flex min-h-10 items-center whitespace-nowrap rounded-xl px-4 text-sm font-semibold transition-colors ${
                  on ? "bg-brand text-white shadow-[0_6px_16px_rgba(106,75,245,0.3)]" : "text-ink-2 hover:bg-hover hover:text-ink"
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
