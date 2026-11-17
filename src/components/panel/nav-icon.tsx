import { PixelIcon } from "@/components/brand/pixel-art";
import type { NavItem } from "./nav-config";

/**
 * A module's icon in the dock, the tab bar and the Launchpad: its 12×12 pixel
 * icon at cell 2 (24px, like the site dock), or the lucide icon (stroke 1.75)
 * for an item without one. Menus, ⌘K and the window title keep `item.icon`.
 * Server-safe (no hooks): used by the client dock and Launchpad.
 */
export function NavIcon({ item, lucideClassName }: { item: NavItem; lucideClassName: string }) {
  if (item.pixel) return <PixelIcon name={item.pixel} cell={2} />;
  const Icon = item.icon;
  return <Icon className={lucideClassName} strokeWidth={1.75} aria-hidden />;
}
