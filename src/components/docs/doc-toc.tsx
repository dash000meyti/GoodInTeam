"use client";

import { useEffect, useState } from "react";
import { ListIcon } from "lucide-react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

export interface TocHeading {
  id: string;
  text: string;
  depth: number;
}

/** "On this page" list with scroll-spy (highlights the heading in view). */
export function DocToc({ headings, className }: { headings: TocHeading[]; className?: string }) {
  const t = useT();
  const [active, setActive] = useState<string | null>(null);
  const min = Math.min(...headings.map((h) => h.depth));

  useEffect(() => {
    const els = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => !!el);
    if (!els.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-88px 0px -65% 0px", threshold: [0, 1] },
    );
    for (const el of els) observer.observe(el);
    return () => observer.disconnect();
  }, [headings]);

  return (
    <nav aria-label={t.docs.onThisPage} className={cn("text-sm", className)}>
      <p className="mb-3 flex items-center gap-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
        <ListIcon className="size-3.5" /> {t.docs.onThisPage}
      </p>
      <ul className="space-y-1 border-s border-dashed">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              onClick={() => setActive(h.id)}
              className={cn(
                "-ms-px block border-s-2 py-1 pe-2 leading-6 transition-colors",
                active === h.id
                  ? "border-primary font-semibold text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
              style={{ paddingInlineStart: 12 + (h.depth - min) * 12 }}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
