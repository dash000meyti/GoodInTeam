import type { CSSProperties, ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Where an entry shows: both modes, only the desktop dock, or only the tab bar. */
export type DockShow = "both" | "desktop" | "mobile";
export type DockVariant = "paper" | "brand" | "accent" | "mark";

/**
 * One dock entry (spec §5.5). Links are rendered by the client `DockLinks`
 * (active state from the pathname); `slot`s are server nodes (More button,
 * the panel Me tile) placed in an `<li data-app>`.
 */
export type DockEntry =
  | {
      kind: "link";
      key: string;
      /** Final (locale-prefixed) href. */
      href: string;
      /** Unprefixed section for the active state; no section → never active (brand tiles). */
      section?: string;
      exact?: boolean;
      /** Visible label = accessible name (no aria-label). */
      label: string;
      icon: ReactNode;
      variant?: DockVariant;
      show?: DockShow;
      prefetch?: boolean;
      external?: boolean;
      /** Visually hidden text appended to the label, e.g. ", 2 timers running". */
      srExtra?: string;
      /** Extra attributes on the link, e.g. `{ "data-dock-app": "" }`. */
      attrs?: Record<string, string>;
    }
  | { kind: "sep"; key: string; show?: DockShow }
  | { kind: "slot"; key: string; node: ReactNode; show?: DockShow };

export const DOCK_ITEM_CLASS = "os-dock-item";
export const DOCK_LABEL_CLASS = "os-dock-label";

/**
 * The dock frame (server-safe): `<nav class="os-dock">` + `<ul class="os-dock-list">`.
 * `tabbar` picks where it becomes a mobile tab bar (md: <768px site, lg:
 * <1024px panel); `magnify` turns on CSS magnification (fine pointers only);
 * `n`/`seps` feed the panel's tile-size formula. Children are `<li>`s
 * (DockLinks output, DockSeparator, slots).
 */
export function Dock({
  label,
  tabbar,
  magnify,
  n,
  seps,
  className,
  children,
}: {
  label: string;
  tabbar: "md" | "lg";
  magnify?: boolean;
  n?: number;
  seps?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <nav
      className={cn("os-dock", className)}
      aria-label={label}
      data-tabbar={tabbar}
      data-magnify={magnify ? "" : undefined}
      style={{ "--dock-n": n, "--dock-seps": seps } as CSSProperties}
    >
      <ul className="os-dock-list">{children}</ul>
    </nav>
  );
}

/** The square tile behind a dock icon (stepped corners). */
export function DockTile({
  variant = "paper",
  className,
  children,
}: {
  variant?: DockVariant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span className={cn("os-tile px-corners", className)} data-variant={variant}>
      {children}
    </span>
  );
}

export function DockSeparator({ show = "both" }: { show?: DockShow }) {
  return <li data-sep="" data-dock={show} aria-hidden />;
}

/** A server slot (`<li data-app>`), e.g. a button that opens the Launchpad. */
export function DockSlot({ show = "both", children }: { show?: DockShow; children: ReactNode }) {
  return (
    <li data-app="" data-dock={show}>
      {children}
    </li>
  );
}
