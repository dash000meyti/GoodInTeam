"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Per-viewer UI preference persisted in localStorage (filters, expanded tree
 * nodes). Starts with `initial` on the server and first render, then hydrates.
 */
export function useLocalState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate persisted preference
      if (raw !== null) setValue(JSON.parse(raw) as T);
    } catch {}
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const v = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        try {
          localStorage.setItem(key, JSON.stringify(v));
        } catch {}
        return v;
      });
    },
    [key],
  );

  return [value, update] as const;
}
