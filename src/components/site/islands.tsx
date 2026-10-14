"use client";

import { useEffect, useState } from "react";
import { CheckIcon, LinkIcon, PlayIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { recordViewAction } from "@/server/modules/content/actions";

/**
 * Tiny client islands for public pages. Labels arrive as props so the public
 * site doesn't ship the `site` message namespace to the browser.
 */

/** Click-to-load YouTube embed: no third-party script or iframe before the click. */
export function LiteYouTube({
  id,
  title,
  poster,
  playLabel,
  notice,
}: {
  id: string;
  title: string;
  poster?: string | null;
  playLabel: string;
  notice: string;
}) {
  const [active, setActive] = useState(false);
  return (
    <div className="relative aspect-video overflow-hidden rounded-3xl bg-grey-900 shadow-card">
      {active ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&modestbranding=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full border-0"
        />
      ) : (
        <button
          type="button"
          onClick={() => setActive(true)}
          aria-label={`${playLabel}: ${title}`}
          className="group absolute inset-0 cursor-pointer"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static thumbnail, no JS */}
          <img
            src={poster || `https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg`}
            alt=""
            loading="eager"
            decoding="async"
            className="absolute inset-0 size-full object-cover opacity-80 transition-opacity group-hover:opacity-95"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-20 items-center justify-center rounded-full bg-white/95 text-grey-900 shadow-dialog transition-transform group-hover:scale-110">
              <PlayIcon className="size-8 translate-x-0.5 fill-current" />
            </span>
          </span>
          <span className="absolute inset-x-0 bottom-0 p-5 text-start text-xs text-white/80">
            {notice}
          </span>
        </button>
      )}
    </div>
  );
}

/** Copy the current page URL. */
export function CopyLink({
  url,
  label,
  doneLabel,
}: {
  url: string;
  label: string;
  doneLabel: string;
}) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          /* clipboard blocked: ignore */
        }
      }}
      className={cn(
        "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 text-xs font-bold transition-colors hover:border-foreground/30",
        done && "border-success/40 text-success",
      )}
      aria-live="polite"
    >
      {done ? <CheckIcon className="size-3.5" /> : <LinkIcon className="size-3.5" />}
      {done ? doneLabel : label}
    </button>
  );
}

/** Counts one view per tab session, after load (never during render). */
export function ViewTracker({ id }: { id: string }) {
  useEffect(() => {
    const key = `gt-view:${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* storage disabled: still count */
    }
    const run = () => void recordViewAction({ id }).catch(() => undefined);
    if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 4000 });
    else setTimeout(run, 1500);
  }, [id]);
  return null;
}

/** Table of contents with the active heading highlighted while scrolling. */
export function Toc({
  headings,
  title,
}: {
  headings: { id: string; text: string; depth: number }[];
  title: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const els = headings
      .map((h) => document.getElementById(h.id))
      .filter((e): e is HTMLElement => !!e);
    if (!els.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-80px 0px -70% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [headings]);
  return (
    <nav aria-label={title} className="space-y-3">
      <p className="text-xs font-black tracking-wide text-muted-foreground uppercase">{title}</p>
      <ol className="space-y-1 border-s border-border">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={cn(
                "-ms-px block border-s-2 border-transparent py-1 text-sm leading-6 text-muted-foreground transition-colors hover:text-foreground",
                h.depth > 2 ? "ps-6" : "ps-4",
                active === h.id && "border-primary font-semibold text-foreground",
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
