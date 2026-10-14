import type { ComponentProps } from "react";
import { Badge } from "@/components/ui/badge";
import type { Messages } from "@/i18n/messages";
import { cn } from "@/lib/utils";
import type { InvoiceStatus } from "@/server/db/schema/finance";

const variants: Record<InvoiceStatus, ComponentProps<typeof Badge>["variant"]> = {
  draft: "neutral",
  sent: "info",
  viewed: "violet",
  partial: "warning",
  paid: "success",
  overdue: "destructive",
  void: "neutral",
};

/** Consistent invoice status chip (soft badge) across finance, invoices and the portal. */
export function InvoiceStatusBadge({
  status,
  t,
  className,
}: {
  status: InvoiceStatus;
  t: Messages["finance"];
  className?: string;
}) {
  return (
    <Badge variant={variants[status]} className={cn(status === "void" && "line-through", className)}>
      {t[`inv_${status}`]}
    </Badge>
  );
}
