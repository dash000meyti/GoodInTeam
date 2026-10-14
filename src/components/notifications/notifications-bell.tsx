"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  BellIcon,
  BellRingIcon,
  CalendarClockIcon,
  CheckCheckIcon,
  CheckSquareIcon,
  TimerIcon,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { localePath } from "@/i18n/config";
import { format } from "@/i18n/format-message";
import { useLocale, useT } from "@/i18n/client";
import { formatNumber, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { HeaderNotification } from "@/server/modules/notifications/header";

const kindStyle: Record<string, { icon: LucideIcon; tone: string }> = {
  task: { icon: CheckSquareIcon, tone: "bg-violet/12 text-violet" },
  event: { icon: CalendarClockIcon, tone: "bg-info/12 text-info" },
  time: { icon: TimerIcon, tone: "bg-warning/16 text-[#b76e00] dark:text-warning" },
};
const fallbackStyle = { icon: BellIcon, tone: "bg-primary/12 text-primary" };

type Permission = NotificationPermission | "unsupported";

function subscribePermission(cb: () => void) {
  // Permission changes are rare; re-check when the tab regains focus.
  window.addEventListener("focus", cb);
  return () => window.removeEventListener("focus", cb);
}
function readPermission(): Permission {
  return typeof Notification === "undefined" ? "unsupported" : Notification.permission;
}

/** Header bell: unread badge + popover with the latest notifications. */
export function NotificationsBell({
  items,
  unread,
  now,
  onMarkRead,
}: {
  items: HeaderNotification[];
  unread: number;
  now: number;
  /** Mark ids (or all when omitted) as read — optimistic in the parent. */
  onMarkRead: (ids?: string[]) => void;
}) {
  const t = useT();
  const n = t.notifications;
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const permission = useSyncExternalStore<Permission>(
    subscribePermission,
    readPermission,
    () => "unsupported",
  );
  const [, force] = useState(0);
  const badge = unread > 9 ? `${formatNumber(9, locale)}+` : formatNumber(unread, locale);

  const openItem = (item: HeaderNotification) => {
    if (!item.read) onMarkRead([item.id]);
    setOpen(false);
    if (item.href) router.push(localePath(locale, item.href));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full"
          aria-label={unread ? format(n.open, { n: formatNumber(unread, locale) }) : n.title}
        >
          {unread ? <BellRingIcon className="size-[18px]" /> : <BellIcon className="size-[18px]" />}
          {unread > 0 && (
            <span className="absolute -end-0.5 -top-0.5 flex h-[18px] min-w-[18px] animate-in items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none font-bold text-white tabular-nums ring-2 ring-background zoom-in-50">
              {badge}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={12}
        className="w-[calc(100vw-1.5rem)] max-w-sm overflow-hidden p-0"
      >
        <div className="flex items-center justify-between gap-2 border-b border-dashed px-4 py-3">
          <div>
            <p className="text-sm font-bold">{n.title}</p>
            {unread > 0 && (
              <p className="text-xs text-muted-foreground">
                {format(n.unread, { n: formatNumber(unread, locale) })}
              </p>
            )}
          </div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={() => onMarkRead()}>
              <CheckCheckIcon /> {n.markAllRead}
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <BellIcon className="size-6" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-semibold">{n.empty}</p>
            <p className="text-xs text-muted-foreground">{n.emptyHint}</p>
          </div>
        ) : (
          <ul className="max-h-[min(24rem,60dvh)] overflow-y-auto py-1">
            {items.map((item) => {
              const style = kindStyle[item.kind.split(".")[0]!] ?? fallbackStyle;
              const Icon = style.icon;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className={cn(
                      "flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-start transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
                      !item.read && "bg-primary/4",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-xl",
                        style.tone,
                      )}
                    >
                      <Icon className="size-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "line-clamp-1 text-sm",
                          item.read ? "font-medium" : "font-bold",
                        )}
                      >
                        <bdi>{item.title}</bdi>
                      </span>
                      {item.body && (
                        <span className="line-clamp-2 text-xs text-muted-foreground">
                          {item.body}
                        </span>
                      )}
                      <span className="mt-1 block text-[11px] text-muted-foreground/80">
                        {formatRelative(item.createdAt, { locale }, now)}
                      </span>
                    </span>
                    {!item.read && (
                      <span
                        className="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
                        aria-hidden
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {permission !== "unsupported" && (
          <div className="flex items-center justify-between gap-3 border-t border-dashed bg-muted/40 px-4 py-3">
            <div className="min-w-0">
              <p className="text-xs font-bold">{n.desktop}</p>
              <p className="text-[11px] text-muted-foreground">
                {permission === "denied" ? n.desktopBlocked : n.desktopHint}
              </p>
            </div>
            {permission === "granted" ? (
              <span className="shrink-0 rounded-md bg-success/16 px-2 py-0.5 text-xs font-bold text-[#118d57] dark:text-[#77ed8b]">
                {n.desktopOn}
              </span>
            ) : permission === "default" ? (
              <Button
                size="sm"
                variant="soft"
                onClick={() =>
                  void Notification.requestPermission().then(() => force((x) => x + 1))
                }
              >
                {n.desktopEnable}
              </Button>
            ) : null}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
