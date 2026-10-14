import Link from "next/link";
import { HistoryIcon, MonitorSmartphoneIcon } from "lucide-react";
import type { Messages } from "@/i18n/messages";
import { cn } from "@/lib/utils";

/** Link-based tabs between Sessions and the Activity log (two sub-routes). */
export function SecurityTabs({
  active,
  href,
  t,
}: {
  active: "sessions" | "activity";
  href: (path: string) => string;
  t: Messages["settings"];
}) {
  const tabs = [
    {
      key: "sessions",
      label: t.tabSessions,
      icon: MonitorSmartphoneIcon,
      path: "/panel/settings/security",
    },
    {
      key: "activity",
      label: t.tabActivity,
      icon: HistoryIcon,
      path: "/panel/settings/security/activity",
    },
  ] as const;
  return (
    <nav className="inline-flex h-10 w-fit items-center gap-1 rounded-xl bg-muted p-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={href(tab.path)}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "inline-flex h-full items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-muted-foreground transition-all hover:text-foreground",
              isActive && "bg-background text-foreground shadow-card dark:bg-card",
            )}
          >
            <Icon className="size-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
