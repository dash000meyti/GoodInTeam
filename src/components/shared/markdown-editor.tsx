"use client";

import { useState, useTransition } from "react";
import { EyeIcon, PencilIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { renderMarkdownAction } from "@/server/modules/markdown/actions";

/**
 * Markdown textarea with a server-rendered preview tab. Works in a plain <form>
 * (submits `name`) or controlled via value/onChange.
 */
export function MarkdownEditor({
  name,
  defaultValue = "",
  value: controlled,
  onChange,
  rows = 14,
  placeholder,
  className,
  dir = "auto",
  mono = false,
}: {
  name?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (v: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
  dir?: "rtl" | "ltr" | "auto";
  /** Monospace textarea (code-heavy content); prose editors use the UI font (default). */
  mono?: boolean;
}) {
  const t = useT();
  const [inner, setInner] = useState(defaultValue);
  const value = controlled ?? inner;
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [html, setHtml] = useState("");
  const [pending, start] = useTransition();

  const preview = () => {
    setTab("preview");
    start(async () => {
      const res = await renderMarkdownAction({ md: value });
      setHtml(res.ok ? res.data : `<p>${res.error.message}</p>`);
    });
  };

  const tabCls = (active: boolean) =>
    cn(
      "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
      active
        ? "bg-background text-foreground shadow-sm dark:bg-card"
        : "text-muted-foreground hover:text-foreground",
    );

  return (
    <div className={cn("overflow-hidden rounded-xl border border-input", className)}>
      <div className="flex items-center gap-1 border-b border-dashed bg-muted/50 p-1.5">
        <button type="button" className={tabCls(tab === "write")} onClick={() => setTab("write")}>
          <PencilIcon className="size-3.5" /> {t.common.edit}
        </button>
        <button type="button" className={tabCls(tab === "preview")} onClick={preview}>
          <EyeIcon className="size-3.5" /> {t.common.view}
        </button>
        <span className="ms-auto px-2 font-mono text-[11px] text-muted-foreground">Markdown</span>
      </div>
      {name && <input type="hidden" name={name} value={value} />}
      {tab === "write" ? (
        <Textarea
          value={value}
          dir={dir}
          onChange={(e) => {
            if (controlled === undefined) setInner(e.target.value);
            onChange?.(e.target.value);
          }}
          rows={rows}
          placeholder={placeholder}
          className={cn(
            "min-h-48 resize-y rounded-none border-0 focus-visible:ring-0",
            mono ? "font-mono text-[13px] leading-6" : "text-[14px] leading-7",
          )}
        />
      ) : (
        <div className="min-h-48 p-4">
          {pending ? (
            <p className="text-sm text-muted-foreground">{t.common.loading}</p>
          ) : (
            <div
              className="prose-gt text-[15px]"
              dangerouslySetInnerHTML={{ __html: html || `<p class="text-muted-foreground">—</p>` }}
            />
          )}
        </div>
      )}
    </div>
  );
}
