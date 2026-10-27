/* eslint-disable @next/next/no-img-element */
import type { MediaRef } from "@/lib/types";

/** A client photo. Signed Supabase URLs show the real image; demo photos show a labelled placeholder. */
export function PhotoTile({ media, className = "h-36 w-28" }: { media: MediaRef & { url?: string | null }; className?: string }) {
  const label = media.label ?? "Photo";
  if (media.url)
    return (
      <a href={media.url} target="_blank" rel="noreferrer" className={`block overflow-hidden rounded-2xl ${className}`}>
        <img src={media.url} alt={label} className="size-full object-cover" />
      </a>
    );
  return (
    <div className={`flex items-end rounded-2xl border border-dashed border-[rgba(26,24,48,0.25)] bg-soft p-2.5 text-xs text-muted ${className}`}>
      {label}
    </div>
  );
}
