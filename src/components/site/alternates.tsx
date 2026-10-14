"use client";

import { createContext, use, useEffect, useState, type ReactNode } from "react";
import type { Locale } from "@/i18n/config";

/**
 * Language-switch targets for the current page. Pages that know their
 * translations (posts with a translationKey) render <SetAlternates>, the
 * header's language toggle reads them; otherwise it falls back to the same
 * path (static pages) or the section index (detail pages).
 */
type Alternates = Partial<Record<Locale, string>> | null;

const Ctx = createContext<{
  alternates: Alternates;
  setAlternates: (a: Alternates) => void;
} | null>(null);

export function AlternatesProvider({ children }: { children: ReactNode }) {
  const [alternates, setAlternates] = useState<Alternates>(null);
  return <Ctx value={{ alternates, setAlternates }}>{children}</Ctx>;
}

export function useAlternates() {
  return use(Ctx)?.alternates ?? null;
}

/** Register the translations of the current page (cleared on unmount). */
export function SetAlternates({ value }: { value: Partial<Record<Locale, string>> }) {
  const ctx = use(Ctx);
  const key = JSON.stringify(value);
  useEffect(() => {
    ctx?.setAlternates(JSON.parse(key) as Partial<Record<Locale, string>>);
    return () => ctx?.setAlternates(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` captures `value`
  }, [key]);
  return null;
}
