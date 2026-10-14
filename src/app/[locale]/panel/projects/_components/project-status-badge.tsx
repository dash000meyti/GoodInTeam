import { Badge } from "@/components/ui/badge";
import type { ProjectStatus } from "@/server/db/schema";
import type { Messages } from "@/i18n/messages";

const variants: Record<ProjectStatus, React.ComponentProps<typeof Badge>["variant"]> = {
  lead: "info",
  planning: "violet",
  active: "success",
  paused: "warning",
  completed: "default",
  canceled: "destructive",
  archived: "neutral",
};

export function ProjectStatusBadge({
  status,
  t,
}: {
  status: ProjectStatus;
  t: Messages["projects"];
}) {
  return <Badge variant={variants[status]}>{t[`status_${status}`]}</Badge>;
}
