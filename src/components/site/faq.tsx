import "server-only";
import { PlusIcon } from "lucide-react";
import type { Messages } from "@/i18n/messages";
import { FrameCell, FrameGrid, FrameSection, type GuideLine } from "./frame";
import { faqLd, JsonLd } from "./json-ld";
import { TitleCell } from "./ui";

/** Studio-wide FAQ (i18n) used on /services and as a fallback on service pages. */
export function generalFaq(t: Messages) {
  const s = t.site;
  return [
    { q: s.faq1Q, a: s.faq1A },
    { q: s.faq2Q, a: s.faq2A },
    { q: s.faq3Q, a: s.faq3A },
    { q: s.faq4Q, a: s.faq4A },
    { q: s.faq5Q, a: s.faq5A },
  ];
}

/**
 * The FAQ rows of a box: a FrameGrid 2-1 of the header cell (h2) and the
 * questions cell, whose native `<details>` (zero JS) are split by hairlines,
 * plus the FAQPage JSON-LD.
 */
export function Faq({
  items,
  title,
  titleId = "faq-title",
}: {
  items: { q: string; a: string }[];
  title: string;
  titleId?: string;
}) {
  if (!items.length) return null;
  return (
    <FrameGrid cols="2-1" className="lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      <TitleCell title={title} titleId={titleId} className="lg:pe-10" />
      <FrameCell pad="none">
        <JsonLd data={faqLd(items)} />
        <div className="divide-y divide-frame-line">
          {items.map((f, i) => (
            <details key={i} className="gt-faq group" open={i === 0}>
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 text-start text-base font-bold transition-colors hover:bg-card md:px-8 md:text-lg">
                {f.q}
                <span className="gt-faq-icon flex size-8 shrink-0 items-center justify-center rounded-[6px] border border-frame-line bg-background transition-transform duration-300">
                  <PlusIcon className="size-4" />
                </span>
              </summary>
              <p className="px-6 pb-6 leading-8 text-pretty text-muted-foreground md:px-8">{f.a}</p>
            </details>
          ))}
        </div>
      </FrameCell>
    </FrameGrid>
  );
}

/** A whole FAQ box (`FrameSection` with its strip and narration). */
export function FaqBox({
  items,
  title,
  guide,
  index,
  path,
  id = "faq",
}: {
  items: { q: string; a: string }[];
  title: string;
  guide: GuideLine;
  index: number;
  path: string;
  id?: string;
}) {
  if (!items.length) return null;
  return (
    <FrameSection id={id} labelledBy={`${id}-title`} guide={guide} strip={{ index, path }}>
      <Faq items={items} title={title} titleId={`${id}-title`} />
    </FrameSection>
  );
}
