import { notFound } from "next/navigation";

/**
 * Every navigation into this segment is a 404, so it is allowed to block:
 * opting out of instant-navigation validation keeps the dev overlay quiet
 * (validation otherwise reports the deliberate notFound() as an error).
 */
export const instant = false;

/**
 * Catch-all so unknown URLs render (site)/not-found.tsx inside the public
 * layout (menu bar, footer, dock) with a real 404 status (no DB lookup here).
 */
export default function CatchAll() {
  notFound();
}
