import { renderMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";

/**
 * Server component: renders markdown with the `prose-gt` typography.
 * Raw HTML is escaped; with `allowHtml` (published content) a safe subset is
 * kept and everything else is removed (see `renderMarkdown`).
 */
export async function Markdown({
  source,
  className,
  allowHtml,
}: {
  source: string;
  className?: string;
  allowHtml?: boolean;
}) {
  const { html } = await renderMarkdown(source, { allowHtml });
  return <div className={cn("prose-gt", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}
