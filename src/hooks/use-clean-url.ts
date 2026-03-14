"use client";

import { useEffect } from "react";

/**
 * Strips listed query-parameter keys from the browser URL bar
 * without triggering a navigation or re-render.
 */
export function useCleanUrl(keys: string[]) {
  useEffect(() => {
    const url = new URL(window.location.href);
    let changed = false;
    for (const k of keys) {
      if (url.searchParams.has(k)) {
        url.searchParams.delete(k);
        changed = true;
      }
    }
    if (changed) {
      window.history.replaceState(null, "", url.pathname + (url.search || ""));
    }
  }, [keys]);
}
