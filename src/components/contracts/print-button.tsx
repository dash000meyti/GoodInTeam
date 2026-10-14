"use client";

import { PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Opens the browser print dialog ("Save as PDF"). */
export function PrintButton({
  label,
  variant = "outline",
  size,
  className,
}: {
  label: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={() => window.print()}
    >
      <PrinterIcon /> {label}
    </Button>
  );
}
