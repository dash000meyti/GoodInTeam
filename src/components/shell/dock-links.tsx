"use client";

import { Suspense } from "react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { stripLocale } from "@/i18n/config";
import { useT } from "@/i18n/client";
import { DockTile, type DockEntry } from "./dock";
import { isActivePath } from "./match";

/**
 * Dock entries as `<li>`s (spec §5.5). Wraps itself in <Suspense> (it reads
 * the pathname) with a fallback that is the same list with no active item.
 * `aria-current="page"` comes from `isActivePath(stripLocale(pathname).path,
 * section, exact)`; `running` lists entry keys that get `data-running` (the
 * dot). Each internal link has a `DockPending` child (useLinkStatus) that
 * drives the launch bounce.
 */
export function DockLinks({
  entries,
  running = [],
}: {
  entries: readonly DockEntry[];
  running?: readonly string[];
}) {
  return (
    <Suspense fallback={<DockItems entries={entries} running={running} path={null} />}>
      <ActiveDockItems entries={entries} running={running} />
    </Suspense>
  );
}

function ActiveDockItems(props: { entries: readonly DockEntry[]; running: readonly string[] }) {
  const pathname = usePathname();
  return <DockItems {...props} path={stripLocale(pathname).path} />;
}

/** Toggles `data-on` while its parent <Link>'s navigation is pending. */
function DockPending() {
  const { pending } = useLinkStatus();
  return <span className="os-dock-pending" data-on={pending ? "" : undefined} aria-hidden />;
}

function DockItems({
  entries,
  running,
  path,
}: {
  entries: readonly DockEntry[];
  running: readonly string[];
  path: string | null;
}) {
  const t = useT();
  return (
    <>
      {entries.map((e) => {
        if (e.kind === "sep")
          return <li key={e.key} data-sep="" data-dock={e.show ?? "both"} aria-hidden />;
        if (e.kind === "slot")
          return (
            <li key={e.key} data-app="" data-dock={e.show ?? "both"}>
              {e.node}
            </li>
          );
        const active = path !== null && isActivePath(path, e.section, e.exact);
        const common = {
          className: "os-dock-item",
          "aria-current": active ? ("page" as const) : undefined,
          "data-running": running.includes(e.key) ? "" : undefined,
          ...e.attrs,
        };
        const body = (
          <>
            <DockTile variant={e.variant}>{e.icon}</DockTile>
            <span className="os-dock-label">{e.label}</span>
            {e.srExtra && <span className="sr-only">{e.srExtra}</span>}
          </>
        );
        return (
          <li key={e.key} data-app="" data-dock={e.show ?? "both"}>
            {e.external ? (
              <a href={e.href} target="_blank" rel="noopener" {...common}>
                {body}
                <span className="sr-only"> {t.common.opensNewTab}</span>
              </a>
            ) : (
              <Link href={e.href} prefetch={e.prefetch} {...common}>
                {body}
                <DockPending />
              </Link>
            )}
          </li>
        );
      })}
    </>
  );
}
