"use client";

import { PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Opens the browser print dialog (print styles turn the invoice into an A4 page). */
export function PrintButton({
  label,
  variant = "outline",
  size = "default",
}: {
  label: string;
  variant?: "outline" | "default" | "soft" | "ghost";
  size?: "default" | "sm";
}) {
  return (
    <Button type="button" variant={variant} size={size} onClick={() => window.print()}>
      <PrinterIcon /> {label}
    </Button>
  );
}
