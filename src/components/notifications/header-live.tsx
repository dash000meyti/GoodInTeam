"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { localePath } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import { TimerPill } from "@/components/time/timer-pill";
import type { ProjectOption } from "@/components/time/project-select";
import type { HeaderSnapshot } from "@/server/modules/notifications/header";
import {
  markNotificationsReadAction,
  pollHeaderAction,
} from "@/server/modules/notifications/actions";
import { NotificationsBell } from "./notifications-bell";

const POLL_MS = 60_000;

/**
 * Live part of the panel top bar: running-timer pill + notifications bell.
 * Starts from the server snapshot, re-syncs whenever the server re-renders
 * (after any action's refresh()), and polls every 60 s while the tab is open.
 * New unread notifications pop as a toast (tab visible) or a native desktop
 * notification (tab hidden, permission granted).
 */
export function HeaderLive({
  initial,
  projects,
  tz,
  showTimers,
}: {
  initial: HeaderSnapshot;
  projects: ProjectOption[];
  tz: string;
  showTimers: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [snap, setSnap] = useState(initial);
  const [source, setSource] = useState(initial);
  if (source !== initial) {
    // Server re-rendered (refresh/navigation): adopt the fresh snapshot.
    setSource(initial);
    setSnap(initial);
  }
  const known = useRef(new Set(initial.items.map((i) => i.id)));
  useEffect(() => {
    for (const i of initial.items) known.current.add(i.id);
  }, [initial]);

  const announce = useCallback(
    (next: HeaderSnapshot) => {
      const fresh = next.items.filter((i) => !i.read && !known.current.has(i.id));
      for (const i of next.items) known.current.add(i.id);
      for (const item of fresh.slice(0, 3)) {
        const go = () => item.href && router.push(localePath(locale, item.href));
        if (document.visibilityState === "visible") {
          toast(item.title, {
            description: item.body ?? undefined,
            action: item.href ? { label: t.common.open, onClick: go } : undefined,
          });
        } else if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          const native = new Notification(item.title, {
            body: item.body ?? undefined,
            tag: item.id,
            icon: "/icon.svg",
            lang: locale,
            dir: locale === "fa" ? "rtl" : "ltr",
          });
          native.onclick = () => {
            window.focus();
            go();
            native.close();
          };
        }
      }
    },
    [locale, router, t.common.open],
  );

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      const res = await pollHeaderAction({});
      if (!alive || !res.ok) return;
      announce(res.data);
      setSnap(res.data);
    };
    const id = setInterval(() => void poll(), POLL_MS);
    const onVisible = () => document.visibilityState === "visible" && void poll();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [announce]);

  const markRead = (ids?: string[]) => {
    setSnap((s) => ({
      ...s,
      unread: ids
        ? Math.max(
            0,
            s.unread - ids.filter((id) => s.items.some((i) => i.id === id && !i.read)).length,
          )
        : 0,
      items: s.items.map((i) => (!ids || ids.includes(i.id) ? { ...i, read: true } : i)),
    }));
    void markNotificationsReadAction({ ids }).then((res) => {
      if (res.ok) setSnap((s) => ({ ...s, unread: res.data.unread }));
    });
  };

  return (
    <>
      {showTimers && (
        <TimerPill running={snap.running} projects={projects} serverNow={snap.now} tz={tz} />
      )}
      <NotificationsBell
        items={snap.items}
        unread={snap.unread}
        now={snap.now}
        onMarkRead={markRead}
      />
    </>
  );
}
