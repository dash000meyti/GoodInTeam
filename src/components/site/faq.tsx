import { PlusIcon } from "lucide-react";
import type { Messages } from "@/i18n/messages";
import { faqLd, JsonLd } from "./json-ld";

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

/** FAQ accordion on native <details> (zero JS) + FAQPage JSON-LD. */
export function Faq({ items, title }: { items: { q: string; a: string }[]; title?: string }) {
  if (!items.length) return null;
  return (
    <section aria-label={title}>
      <JsonLd data={faqLd(items)} />
      {title && <h2 className="mb-8 text-3xl font-black tracking-tight sm:text-4xl">{title}</h2>}
      <div className="divide-y divide-dashed divide-border rounded-3xl border border-border bg-card">
        {items.map((f, i) => (
          <details key={i} className="gt-faq group" open={i === 0}>
            <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 text-start text-base font-bold transition-colors hover:text-primary sm:text-lg">
              {f.q}
              <span className="gt-faq-icon flex size-8 shrink-0 items-center justify-center rounded-full bg-muted transition-transform duration-300">
                <PlusIcon className="size-4" />
              </span>
            </summary>
            <p className="px-6 pb-6 leading-8 text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
