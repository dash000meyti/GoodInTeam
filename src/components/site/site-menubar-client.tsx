"use client";

import { Suspense, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMotionPref } from "@/components/shell/appearance";
import {
  dispatchGuide,
  GUIDE_PREF_EVENT,
  readGuidePref,
  writeGuidePref,
  type GuideEventType,
} from "@/components/shell/guide-events";
import { isActivePath } from "@/components/shell/match";
import { stripLocale } from "@/i18n/config";
import { cn } from "@/lib/utils";

/**
 * Tiny client islands of the public OS shell (spec §7.2–7.3). Labels arrive
 * as props from the server, so the `guide` namespace never ships.
 */

export interface MenuLink {
  href: string;
  /** Unprefixed section path for the active state. */
  section: string;
  label: string;
}

function MenuLinks({ items, path }: { items: MenuLink[]; path: string | null }) {
  return items.map((it) => {
    const active = path !== null && isActivePath(path, it.section);
    return (
      <Link
        key={it.href}
        href={it.href}
        aria-current={active ? "page" : undefined}
        data-label={it.label}
        className="os-mb-item os-mb-link"
      >
        {it.label}
      </Link>
    );
  });
}

function ActiveMenuLinks({ items }: { items: MenuLink[] }) {
  return <MenuLinks items={items} path={stripLocale(usePathname()).path} />;
}

/** Section links of the menu bar; `aria-current` from the pathname (inside <Suspense>). */
export function SiteMenuLinks({ items }: { items: MenuLink[] }) {
  return (
    <Suspense fallback={<MenuLinks items={items} path={null} />}>
      <ActiveMenuLinks items={items} />
    </Suspense>
  );
}

/**
 * "What's this part?" / "Tour": hides its popover FIRST (a click inside an
 * auto popover does not light-dismiss it, and the guide must not open its
 * bubble under a menu), then asks the guide. Works while the guide is muted
 * (the assistant's loader starts it in explicit-only mode).
 */
export function GuideAction({
  popover,
  type,
  className,
  children,
}: {
  popover: string;
  type: Extract<GuideEventType, "explain" | "tour">;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        document.getElementById(popover)?.hidePopover();
        dispatchGuide(type);
      }}
    >
      {children}
    </button>
  );
}

function subscribeGuidePref(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(GUIDE_PREF_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(GUIDE_PREF_EVENT, onChange);
  };
}
const guideOn = () => readGuidePref() !== "off";
const serverOn = () => true;

/** A native `role="switch"` with the shell's track and thumb (no Radix). */
function OsSwitch({
  checked,
  onToggle,
  label,
  className,
}: {
  checked: boolean;
  onToggle: () => void;
  label: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className={cn("os-switch-row", className)}
    >
      <span className="min-w-0 flex-1 text-start">{label}</span>
      <span className="os-switch" aria-hidden>
        <span />
      </span>
    </button>
  );
}

/** Show/hide the pixel guide (`gt-guide`), synced across tabs and islands. */
export function GuideSwitch({ label, className }: { label: ReactNode; className?: string }) {
  const on = useSyncExternalStore(subscribeGuidePref, guideOn, serverOn);
  return (
    <OsSwitch
      checked={on}
      onToggle={() => writeGuidePref(!on)}
      label={label}
      className={className}
    />
  );
}

/** The site's Reduce motion switch (`html[data-motion]`, persisted in `gt-motion`). */
export function MotionSwitch({ label, className }: { label: ReactNode; className?: string }) {
  const { reduced, setReduced } = useMotionPref();
  return (
    <OsSwitch
      checked={reduced}
      onToggle={() => setReduced(!reduced)}
      label={label}
      className={className}
    />
  );
}
