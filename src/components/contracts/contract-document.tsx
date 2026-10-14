import { localeMeta, type Locale } from "@/i18n/config";
import { renderMarkdown } from "@/lib/markdown";
import { cn } from "@/lib/utils";
import { highlightPlaceholdersHtml } from "@/server/modules/contracts/placeholders";

/**
 * Server component: the contract body as typeset markdown (`prose-gt`), in the
 * document's own direction, with unfilled `{{placeholders}}` highlighted.
 * Raw HTML in the body is escaped (contracts are not trusted public content).
 */
export async function ContractDocument({
  bodyMd,
  locale,
  className,
}: {
  bodyMd: string;
  locale: Locale;
  className?: string;
}) {
  const { html } = await renderMarkdown(bodyMd);
  return (
    <div
      dir={localeMeta[locale].dir}
      lang={locale}
      className={cn(
        "prose-gt text-[15px] sm:text-base",
        "[&_mark.gt-placeholder]:rounded-md [&_mark.gt-placeholder]:bg-warning/25 [&_mark.gt-placeholder]:px-1 [&_mark.gt-placeholder]:font-mono [&_mark.gt-placeholder]:text-[0.85em] [&_mark.gt-placeholder]:text-[#b76e00] dark:[&_mark.gt-placeholder]:text-[#ffd666]",
        // prose-gt is unlayered CSS, so overrides need `!`.
        "[&_h1]:text-2xl! sm:[&_h1]:text-[1.75rem]! [&_h2]:mt-9! [&_h2]:text-xl! [&_h3]:text-lg!",
        locale === "fa" && "[&_ol]:list-[persian]!",
        // Heading anchors from the markdown renderer must read as plain headings in a contract.
        "[&_:is(h1,h2,h3,h4)_a]:text-inherit! [&_:is(h1,h2,h3,h4)_a]:no-underline!",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: highlightPlaceholdersHtml(html) }}
    />
  );
}
