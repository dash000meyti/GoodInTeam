import { notFound } from "next/navigation";

/**
 * Catch-all so unknown URLs render (site)/not-found.tsx inside the public
 * layout (header + footer) with a real 404 status (no DB lookup here).
 */
export default function CatchAll() {
  notFound();
}
