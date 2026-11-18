"use client";

import { PrinterIcon } from "lucide-react";

/** The site's pill that opens the print dialog (print styles turn the invoice into an A4 page). */
export function PrintPill({ label, className }: { label: string; className: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={className}>
      <PrinterIcon aria-hidden className="size-4" /> {label}
    </button>
  );
}
