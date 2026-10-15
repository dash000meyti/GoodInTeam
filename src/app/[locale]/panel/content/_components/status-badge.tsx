import { Badge } from "@/components/ui/badge";
import type { Messages } from "@/i18n/messages";

export const postStatusVariant = {
  draft: "neutral",
  scheduled: "info",
  published: "success",
  archived: "warning",
} as const;

export function PostStatusBadge({
  status,
  t,
}: {
  status: keyof typeof postStatusVariant;
  t: Messages;
}) {
  return <Badge variant={postStatusVariant[status]}>{t.content[`status_${status}`]}</Badge>;
}
