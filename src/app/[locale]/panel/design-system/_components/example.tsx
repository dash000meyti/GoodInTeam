import type { ReactNode } from "react";
import { CopyButton } from "@/components/shared/copy-button";
import { renderMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";

/**
 * Highlighted snippets of the catalog, kept for the life of the process.
 *
 * A plain module-level map, on purpose NOT a `'use cache'` function: a cached
 * function is a public endpoint (it has a server reference id), and this one
 * would take free-form text. The snippets are static strings in the catalog's
 * own source, so the map is as large as the catalog; the cap only guards
 * against a future caller that passes something else.
 */
const snippets = new Map<string, Promise<string>>();
const MAX_SNIPPETS = 500;

/** Shiki-highlighted snippet (light + dark). */
function highlight(code: string, lang: string) {
  const key = `${lang}\n${code}`;
  let html = snippets.get(key);
  if (!html) {
    if (snippets.size >= MAX_SNIPPETS) snippets.clear();
    html = renderMarkdown(`\`\`\`${lang}\n${code}\n\`\`\``).then((r) => r.html);
    snippets.set(key, html);
    html.catch(() => snippets.delete(key));
  }
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
        // .prose-gt is layered, so plain utilities win; the `!` also beats Shiki's inline colours.
        className={cn(
          "prose-gt",
          "max-h-72 scrollbar-thin overflow-auto [&_pre]:!m-0 [&_pre]:!rounded-none [&_pre]:!border-0 [&_pre]:!bg-transparent [&_pre]:!px-4 [&_pre]:!pt-1 [&_pre]:!pb-3 [&_pre]:!text-[12.5px] [&_pre]:!leading-6 [&_pre_span]:!bg-transparent",
        )}
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
        "flex min-w-0 flex-col overflow-hidden border border-frame-line bg-card",
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
