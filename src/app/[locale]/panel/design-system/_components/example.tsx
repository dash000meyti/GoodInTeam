import type { ReactNode } from "react";
import { cacheLife } from "next/cache";
import { CopyButton } from "@/components/shared/copy-button";
import { renderMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";

/** Shiki-highlighted snippet (light + dark). Static input → cached across requests. */
async function highlight(code: string, lang: string) {
  "use cache";
  cacheLife("max");
  const { html } = await renderMarkdown(`\`\`\`${lang}\n${code}\n\`\`\``);
  return html;
}

/** Copyable, highlighted code snippet. */
export async function CodeBlock({
  code,
  lang = "tsx",
  className,
}: {
  code: string;
  lang?: string;
  className?: string;
}) {
  const html = await highlight(code.trim(), lang);
  return (
    <div dir="ltr" className={cn("min-w-0", className)}>
      <div className="flex items-center justify-between gap-2 px-3 pt-1.5">
        <span className="font-mono text-[11px] font-semibold text-muted-foreground uppercase">
          {lang}
        </span>
        <CopyButton value={code.trim()} size="icon-sm" />
      </div>
      <div
        // .prose-gt rules are unlayered → overrides need `!` to win over them.
        className="prose-gt max-h-72 scrollbar-thin overflow-auto [&_pre]:!m-0 [&_pre]:!rounded-none [&_pre]:!border-0 [&_pre]:!bg-transparent [&_pre]:!px-4 [&_pre]:!pt-1 [&_pre]:!pb-3 [&_pre]:!text-[12.5px] [&_pre]:!leading-6 [&_pre_span]:!bg-transparent"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}

/**
 * One catalog entry: a live preview on a dotted canvas + its usage snippet.
 * Pass `code` as a static string (it is what agents/humans copy).
 */
export async function Example({
  title,
  description,
  code,
  children,
  className,
  previewClassName,
}: {
  title: ReactNode;
  description?: ReactNode;
  code?: string;
  children: ReactNode;
  className?: string;
  previewClassName?: string;
}) {
  return (
    <figure
      className={cn(
        "flex min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-card",
        className,
      )}
    >
      <figcaption className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-dashed px-4 py-3">
        <span className="text-sm font-bold">{title}</span>
        {description && <span className="text-xs text-muted-foreground">{description}</span>}
      </figcaption>
      <div
        className={cn(
          "bg-dots flex flex-1 flex-wrap items-center gap-3 p-5 sm:p-6",
          previewClassName,
        )}
      >
        {children}
      </div>
      {code && <CodeBlock code={code} className="border-t border-dashed bg-muted/30" />}
    </figure>
  );
}
