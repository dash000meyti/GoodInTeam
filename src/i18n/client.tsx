"use client";

import { createContext, use, type ReactNode } from "react";
import { localeMeta, type Locale } from "./config";
import type { Messages } from "./messages";

interface I18nValue {
  locale: Locale;
  dir: "rtl" | "ltr";
  messages: Partial<Messages>;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Partial<Messages>;
  children: ReactNode;
}) {
  return (
    <I18nContext value={{ locale, dir: localeMeta[locale].dir, messages }}>{children}</I18nContext>
  );
}

export function useI18n() {
  const v = use(I18nContext);
  if (!v) throw new Error("useI18n must be used inside <I18nProvider>");
  return v;
}

/**
 * Typed messages in client components: `const t = useT(); t.common.save`.
 * Only namespaces passed to the nearest provider are available (the public
 * site ships `common`, `nav`, `site`; the panel ships everything).
 */
export function useT(): Messages {
  return useI18n().messages as Messages;
}

export function useLocale(): Locale {
  return useI18n().locale;
}
