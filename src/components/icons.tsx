/** Line icons shared by the sidebar and page headers. */
export const NAV_ICONS: Record<string, React.ReactNode> = {
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
  training: <path d="M4 19V8l8-4 8 4v11M8 19v-6h8v6M4 19h16" />,
  billing: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18M7 15h4" />
    </>
  ),
};

export function NavIcon({ name, size = 20, strokeWidth = 1.8 }: { name: string; size?: number; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      {NAV_ICONS[name]}
    </svg>
  );
}

/** Page title with a glossy gradient icon tile. */
export function PageHeader({ icon, title, sub, children }: { icon: string; title: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-4">
        <span className="icon-tile size-14 shrink-0 rounded-[18px]">
          <NavIcon name={icon} size={26} strokeWidth={1.9} />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-[30px] font-bold leading-tight tracking-[-0.03em] md:text-[34px]">{title}</h1>
          {sub && <p className="mt-1 max-w-2xl text-sm text-muted">{sub}</p>}
        </div>
      </div>
      {children}
    </header>
  );
}
