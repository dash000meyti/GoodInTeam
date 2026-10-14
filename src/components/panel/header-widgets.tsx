import type { Actor } from "@/server/auth/actor";

/**
 * Extension point: session-aware widgets shown in the panel top bar,
 * before the user menu (e.g. running timers, notifications).
 * Modules add their widget here.
 */
export async function HeaderWidgets({ actor }: { actor: Actor }) {
  void actor;
  return null;
}
