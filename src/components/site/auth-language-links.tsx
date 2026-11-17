"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/client";
import { localePath, locales, stripLocale, type Locale } from "@/i18n/config";

type Glyphs = Record<Locale, string>;

function Links({ current, path, glyphs }: { current: Locale; path: string; glyphs: Glyphs }) {
  const t = useT();
  return locales.map((l) => (
    <a
      key={l}
      href={localePath(l, path)}
      hrefLang={l}
      lang={l}
      aria-current={l === current ? "true" : undefined}
      aria-label={`${t.common.language} (${glyphs[l]})`}
      className="os-mb-item os-mb-lang"
    >
      {glyphs[l]}
    </a>
  ));
}

function SamePathLinks({ current, glyphs }: { current: Locale; glyphs: Glyphs }) {
  return <Links current={current} glyphs={glyphs} path={stripLocale(usePathname()).path} />;
}

/**
 * The login screen's language links (spec §7.6): plain `<a hrefLang lang>`
 * to the same path in each locale (a full page load, never a <Link>). The
 * pathname is URL data, so the real targets render inside <Suspense>; the
 * fallback points at each locale's /login.
 */
export function AuthLanguageLinks({ current, glyphs }: { current: Locale; glyphs: Glyphs }) {
  return (
    <Suspense fallback={<Links current={current} glyphs={glyphs} path="/login" />}>
      <SamePathLinks current={current} glyphs={glyphs} />
    </Suspense>
  );
}
