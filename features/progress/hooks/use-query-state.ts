"use client";

import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * One URL query parameter as state, so a page's tab and filters survive refresh, Back and shared links.
 * Writes with history.replaceState (Next keeps useSearchParams in sync), so filtering doesn't pile up history
 * entries. The fallback, or a value not in `allowed`, reads back as the fallback and is left out of the URL.
 */
export function useQueryState<T extends string = string>(key: string, fallback: NoInfer<T>, allowed?: readonly T[]): [T, (value: T | "" | undefined) => void] {
  const params = useSearchParams();
  const raw = params.get(key);
  const value = raw !== null && (!allowed || allowed.includes(raw as T)) ? (raw as T) : fallback;

  const set = useCallback(
    (next: T | "" | undefined) => {
      const p = new URLSearchParams(window.location.search);
      if (!next || next === fallback) p.delete(key);
      else p.set(key, next);
      const qs = p.toString();
      // null state, as Next's docs do: passing Next's own history state back makes the router ignore the change.
      window.history.replaceState(null, "", `${window.location.pathname}${qs ? `?${qs}` : ""}`);
    },
    [key, fallback],
  );

  return [value, set];
}
