import {
  CheckCircle2Icon,
  CircleDashedIcon,
  CircleSlashIcon,
  ClockAlertIcon,
  EyeIcon,
  SendIcon,
  XCircleIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Messages } from "@/i18n/messages";
import type { ContractStatus } from "@/server/db/schema/contracts";

type Variant = React.ComponentProps<typeof Badge>["variant"];

/** One color per status, consistent across the panel, portal and signing page. */
export const contractStatusVariant: Record<ContractStatus, Variant> = {
  draft: "neutral",
  sent: "info",
  viewed: "violet",
  signed: "success",
  declined: "destructive",
  void: "neutral",
  expired: "warning",
};

const icons = {
  draft: CircleDashedIcon,
  sent: SendIcon,
  viewed: EyeIcon,
  signed: CheckCircle2Icon,
  declined: XCircleIcon,
  void: CircleSlashIcon,
  expired: ClockAlertIcon,
} as const;

export function contractStatusLabel(
  status: ContractStatus,
  requireSignature: boolean,
  t: Messages["contracts"],
) {
  return status === "signed" && !requireSignature ? t.status_approved : t[`status_${status}`];
}

export function ContractStatusBadge({
  status,
  requireSignature = true,
  t,
  className,
}: {
  status: ContractStatus;
  requireSignature?: boolean;
  t: Messages["contracts"];
  className?: string;
}) {
  const Icon = icons[status];
  return (
    <Badge variant={contractStatusVariant[status]} className={className}>
      <Icon aria-hidden />
      {contractStatusLabel(status, requireSignature, t)}
    </Badge>
  );
}

export function ContractKindBadge({
  kind,
  t,
  className,
}: {
  kind: "contract" | "proposal" | "nda" | "approval" | "change_request";
  t: Messages["contracts"];
  className?: string;
}) {
  return (
    <Badge variant="outline" className={className}>
      {t[`kind_${kind}`]}
    </Badge>
  );
}
