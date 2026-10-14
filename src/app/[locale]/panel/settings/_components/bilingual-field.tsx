"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

const LANGS = ["fa", "en"] as const;
type Lang = (typeof LANGS)[number];

/**
 * One setting in two languages. Side by side on md+ screens; on phones a
 * fa/en switch shows one at a time (both inputs stay mounted, so the form
 * always submits `<name>.fa` and `<name>.en`). Errors show a dot on the tab.
 */
export function BilingualField({
  name,
  label,
  hint,
  values,
  errors,
  multiline,
  rows = 4,
  required,
  maxLength,
  placeholder,
}: {
  name: string;
  label: string;
  hint?: string;
  values: { fa: string; en: string };
  errors: Record<string, string[] | undefined>;
  multiline?: boolean;
  rows?: number;
  required?: boolean;
  maxLength?: number;
  placeholder?: { fa?: string; en?: string };
}) {
  const t = useT();
  const [tab, setTab] = useState<Lang>("fa");
  const errorOf = (l: Lang) => errors[`${name}.${l}`]?.[0];
  return (
    <div data-slot="field" className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={`${name}-${tab}`}>
          {label}
          {required && <span className="text-destructive">*</span>}
        </Label>
        <div className="flex rounded-lg bg-muted p-0.5 md:hidden" role="tablist" aria-label={label}>
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              role="tab"
              aria-selected={tab === l}
              onClick={() => setTab(l)}
              className={cn(
                "relative cursor-pointer rounded-md px-2.5 py-1 text-xs font-bold text-muted-foreground transition-colors",
                tab === l && "bg-background text-foreground shadow-sm dark:bg-card",
              )}
            >
              {t.settings[`lang_${l}`]}
              {errorOf(l) && tab !== l && (
                <span
                  className="absolute -end-0.5 -top-0.5 size-2 rounded-full bg-destructive"
                  aria-label={t.settings.hasErrors}
                />
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {LANGS.map((l) => {
          const id = `${name}-${l}`;
          const error = errorOf(l);
          const common = {
            id,
            name: `${name}.${l}`,
            defaultValue: values[l],
            maxLength,
            lang: l,
            placeholder: placeholder?.[l],
            // No native `required`: a hidden (other-language) input can't show
            // the browser bubble. The server validates and flags the tab instead.
            "aria-required": required || undefined,
            "aria-invalid": error ? true : undefined,
          };
          return (
            <div
              key={l}
              dir={l === "fa" ? "rtl" : "ltr"}
              className={cn("relative space-y-1.5", tab !== l && "hidden md:block")}
            >
              {multiline ? (
                <Textarea {...common} rows={rows} className="pe-10" />
              ) : (
                <Input {...common} className="pe-10" />
              )}
              <span
                aria-hidden
                className="pointer-events-none absolute end-2 top-2.5 rounded bg-muted px-1 py-0.5 font-mono text-[10px] font-bold text-muted-foreground uppercase"
              >
                {l}
              </span>
              {error && (
                <p className="text-xs font-medium text-destructive" role="alert">
                  {error}
                </p>
              )}
            </div>
          );
        })}
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
