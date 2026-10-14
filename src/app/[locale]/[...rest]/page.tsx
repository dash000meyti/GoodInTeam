import { notFound } from "next/navigation";

/** Catch-all so unknown URLs render [locale]/not-found.tsx inside the root layout. */
export default function CatchAll() {
  notFound();
}
