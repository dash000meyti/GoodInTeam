"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { LanguagesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { localeMeta, localePath, locales, stripLocale, type Locale } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";

function Items({ current }: { current: Locale }) {
  // usePathname() is URL data → must render inside <Suspense> (Cache Components).
  const { path } = stripLocale(usePathname());
  return locales.map((l) => (
    <DropdownMenuItem key={l} asChild className={l === current ? "font-bold" : undefined}>
      {/* Plain <a>: a locale switch is a full page load (<html lang/dir>, fonts). */}
      <a href={localePath(l, path)} hrefLang={l} lang={l}>
        {localeMeta[l].label}
      </a>
    </DropdownMenuItem>
  ));
}

export function LocaleSwitcher() {
  const current = useLocale();
  const t = useT();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label={t.common.language}>
          <LanguagesIcon className="size-[18px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <Suspense
          fallback={locales.map((l) => (
            <DropdownMenuItem key={l} asChild>
              <a href={localePath(l, "/")} hrefLang={l} lang={l}>
                {localeMeta[l].label}
              </a>
            </DropdownMenuItem>
          ))}
        >
          <Items current={current} />
        </Suspense>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
