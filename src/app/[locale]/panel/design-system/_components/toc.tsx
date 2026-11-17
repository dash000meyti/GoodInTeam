"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { chromeRootMargin } from "@/components/shell/chrome-vars";

export interface TocItem {
  id: string;
  label: string;
}

/**
 * Sticky table of contents with scroll-spy. Desktop: a column on the end side;
 * smaller screens: a horizontally scrollable chip bar under the header.
 */
export function Toc({
  items,
  title,
  variant,
}: {
  items: TocItem[];
  title: string;
  variant: "bar" | "side";
}) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const sections = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => !!el);
    const visible = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          visible.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
        // The first section (in document order) that is on screen wins.
        const first = sections.find((s) => (visible.get(s.id) ?? 0) > 0);
        if (first) setActive(first.id);
      },
      { rootMargin: chromeRootMargin("-55%"), threshold: [0, 0.01, 0.25] },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [items]);

  const link = (item: TocItem, chip: boolean) => (
    <a
      key={item.id}
      href={`#${item.id}`}
      aria-current={active === item.id ? "location" : undefined}
      onClick={() => setActive(item.id)}
      className={cn(
        chip
          ? "shrink-0 rounded-full border border-dashed px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          : "block border-s-2 border-transparent py-1.5 ps-3 text-sm text-muted-foreground transition-colors hover:text-foreground",
        active === item.id &&
          (chip
            ? "border-solid border-primary/30 bg-primary/8 text-primary-dark dark:text-primary-light"
            : "border-primary-ink font-bold text-foreground"),
      )}
    >
      {item.label}
    </a>
  );

  if (variant === "bar")
    return (
      <nav
        aria-label={title}
        className="sticky top-chrome z-30 -mx-4 flex scrollbar-none gap-2 overflow-x-auto bg-background/95 px-4 py-2 sm:-mx-6 sm:px-6 xl:hidden"
      >
        {items.map((i) => link(i, true))}
      </nav>
    );
  return (
    <nav aria-label={title} className="sticky below-chrome">
      <p className="mb-2 text-[11px] font-bold tracking-wide text-muted-foreground/80 uppercase">
        {title}
      </p>
      <div className="border-s">{items.map((i) => link(i, false))}</div>
    </nav>
  );
}
