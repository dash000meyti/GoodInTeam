import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Class names of the shared OS chrome (os-shell.css). Use these constants
 * instead of retyping strings, so the CSS contract stays greppable.
 */
export const MENUBAR_CLASS = "os-menubar";
/** A menu-bar button/link (24px tall; 36px on touch and below 768px). */
export const MB_ITEM_CLASS = "os-mb-item";
/** An icon-only menu-bar button (28×24). */
export const MB_ICON_CLASS = "os-mb-item os-mb-icon";
/** Visual menu surface (site popovers and panel Radix content). */
export const MENU_CLASS = "os-menu";
/** A native-popover menu positioned under the menu bar (site only). */
export const POPMENU_CLASS = "os-menu os-popmenu";
export const MENU_ITEM_CLASS = "os-menu-item";
export const MENU_SEP_CLASS = "os-menu-sep";
export const MENU_LABEL_CLASS = "os-menu-label";
export const MENU_SHORTCUT_CLASS = "os-menu-shortcut";

/**
 * Server-safe menu bar frame (spec §5.3): `<header class="os-menubar">` with a
 * labelled start `<nav>`, a spacer and the end group. Sticky, 32px on desktop
 * with a fine pointer and 44px otherwise (`--menubar-h`); the only blurred
 * surface besides the dock.
 */
export function MenuBarShell({
  label,
  start,
  end,
  className,
}: {
  label: string;
  start: ReactNode;
  end?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn(MENUBAR_CLASS, className)}>
      <nav aria-label={label} className="os-mb-start">
        {start}
      </nav>
      <div className="os-mb-spacer" />
      <div className="os-mb-end">{end}</div>
    </header>
  );
}
