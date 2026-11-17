"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { CheckIcon, LanguagesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { localeMeta, localePath, locales, stripLocale, type Locale } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";

/** Short visible glyph per locale (menu-bar language item, spec §7.2/§11.2). */
export const localeGlyph: Record<Locale, string> = { fa: "فا", en: "EN" };

function Items({ current }: { current: Locale }) {
  // usePathname() is URL data → must render inside <Suspense> (Cache Components).
  const { path } = stripLocale(usePathname());
  return <LocaleItems current={current} path={path} />;
}

function LocaleItems({ current, path }: { current: Locale; path: string }) {
  return locales.map((l) => (
    <DropdownMenuItem key={l} asChild className={l === current ? "font-bold" : undefined}>
      {/* Plain <a>: a locale switch is a full page load (<html lang/dir>, fonts). */}
      <a
        href={localePath(l, path)}
        hrefLang={l}
        lang={l}
        aria-current={l === current ? "true" : undefined}
      >
        <span className="w-5 text-center text-xs font-bold opacity-70" aria-hidden>
          {localeGlyph[l]}
        </span>
        {localeMeta[l].label}
        {l === current && <CheckIcon className="ms-auto" aria-hidden />}
      </a>
    </DropdownMenuItem>
  ));
}

/**
 * Language menu. `variant="icon"` (default): a round icon button (signing page).
 * `variant="text"`: the panel menu-bar item showing the current glyph «فا» / EN;
 * its accessible name contains that glyph (WCAG 2.5.3).
 */
export function LocaleSwitcher({ variant = "icon" }: { variant?: "icon" | "text" }) {
  const current = useLocale();
  const t = useT();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "text" ? (
          <button
            type="button"
            className="os-mb-item min-w-7 justify-center px-1.5 text-[13px] font-semibold"
            aria-label={`${t.common.language} (${localeGlyph[current]})`}
          >
            <span aria-hidden lang={current}>
              {localeGlyph[current]}
            </span>
          </button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full"
            aria-label={t.common.language}
          >
            <LanguagesIcon className="size-[18px]" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <Suspense fallback={<LocaleItems current={current} path="/" />}>
          <Items current={current} />
        </Suspense>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
