"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDownIcon, PlusIcon, SearchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/shared/select-field";
import { localePath } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import { contentTypes } from "@/lib/content";

/**
 * Filter row of the posts box: search, type, language, status (URL-driven).
 * Phones: the search takes the row, the three selects share the next one.
 */
export function PostFilters({
  type,
  locale: filterLocale,
  status,
  q,
}: {
  type?: string;
  locale?: string;
  status?: string;
  q?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [query, setQuery] = useState(q ?? "");
  const go = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const next = { type, locale: filterLocale, status, q: query || undefined, ...patch };
    for (const [k, v] of Object.entries(next)) if (v) params.set(k, v);
    const qs = params.toString();
    start(() => router.replace(localePath(locale, `/panel/content${qs ? `?${qs}` : ""}`)));
  };
  return (
    <div className="flex flex-wrap items-center gap-2" data-pending={pending || undefined}>
      <form
        className="relative w-full md:w-auto md:min-w-56 md:flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          go({ q: query || undefined });
        }}
      >
        <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.content.searchPosts}
          className="ps-9"
          aria-label={t.common.search}
        />
      </form>
      <SelectField
        value={type ?? ""}
        onChange={(v) => go({ type: v || undefined })}
        noneLabel={t.content.allTypes}
        placeholder={t.content.allTypes}
        className="min-w-0 flex-1 basis-28 md:w-40 md:flex-none md:basis-auto"
        options={contentTypes.map((k) => ({ value: k, label: t.site[`type_${k}`] }))}
      />
      <SelectField
        value={filterLocale ?? ""}
        onChange={(v) => go({ locale: v || undefined })}
        noneLabel={t.content.allLocales}
        placeholder={t.content.allLocales}
        className="min-w-0 flex-1 basis-28 md:w-36 md:flex-none md:basis-auto"
        options={[
          { value: "fa", label: t.content.locale_fa },
          { value: "en", label: t.content.locale_en },
        ]}
      />
      <SelectField
        value={status ?? ""}
        onChange={(v) => go({ status: v || undefined })}
        noneLabel={t.content.allStatuses}
        placeholder={t.content.allStatuses}
        className="min-w-0 flex-1 basis-28 md:w-40 md:flex-none md:basis-auto"
        options={(["draft", "scheduled", "published", "archived"] as const).map((s) => ({
          value: s,
          label: t.content[`status_${s}`],
        }))}
      />
    </div>
  );
}

/** "New ▾" menu: pick the content type to create. */
export function NewPostMenu() {
  const t = useT();
  const locale = useLocale();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <PlusIcon /> {t.content.newPost}
          <ChevronDownIcon className="opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {contentTypes.map((k) => (
          <DropdownMenuItem key={k} asChild>
            <Link href={localePath(locale, `/panel/content/new?type=${k}`)}>
              {t.site[`type_${k}`]}
            </Link>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
