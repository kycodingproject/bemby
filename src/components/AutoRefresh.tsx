"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-fetches the page's server data every few seconds so new texts appear without reloading. */
export function AutoRefresh({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
