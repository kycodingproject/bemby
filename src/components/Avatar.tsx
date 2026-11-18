/** Gradient fallback colors, picked from the client's name so each person keeps theirs. */
const COLORS = [
  "linear-gradient(140deg, #8c6bff, #6a4bf5)",
  "linear-gradient(140deg, #ff8fc7, #e05aa8)",
  "linear-gradient(140deg, #6fd3ff, #4b7bf5)",
  "linear-gradient(140deg, #ffc48a, #f07a4b)",
  "linear-gradient(140deg, #5fe0b5, #1a9e86)",
];

/** The client's Instagram/TikTok profile photo, or their initial on a gradient circle if there isn't one. */
export function Avatar({ name, url, size = 42 }: { name: string; url?: string | null; size?: number }) {
  const letter = (name.replace(/^@/, "")[0] ?? "?").toUpperCase();
  const style = { width: size, height: size };
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- short-lived signed storage links, not worth Next's image optimizer
    return <img src={url} alt="" width={size} height={size} style={style} className="shrink-0 rounded-full object-cover shadow-[0_0_0_2px_#fff,0_4px_10px_-4px_rgba(60,40,140,0.5)]" />;
  }
  return (
    <span
      aria-hidden
      style={{ ...style, background: COLORS[(name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % COLORS.length], fontSize: Math.round(size * 0.36) }}
      className="flex shrink-0 items-center justify-center rounded-full font-display font-bold text-white shadow-[inset_0_-3px_6px_rgba(0,0,0,0.18),inset_0_1px_2px_rgba(255,255,255,0.4)]"
    >
      {letter}
    </span>
  );
}
