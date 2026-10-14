import { LockIcon, Share2Icon, UsersIcon, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Messages } from "@/i18n/messages";

export type DocVisibility = "private" | "team" | "client";

export const VISIBILITY_ICONS: Record<DocVisibility, LucideIcon> = {
  private: LockIcon,
  team: UsersIcon,
  client: Share2Icon,
};

const VARIANTS = { private: "neutral", team: "info", client: "violet" } as const;

/** Soft badge for a doc's visibility (works in server and client components). */
export function VisibilityBadge({
  visibility,
  t,
  className,
}: {
  visibility: DocVisibility;
  t: Messages["docs"];
  className?: string;
}) {
  const Icon = VISIBILITY_ICONS[visibility];
  return (
    <Badge variant={VARIANTS[visibility]} className={className}>
      <Icon /> {t[`visibility_${visibility}`]}
    </Badge>
  );
}
