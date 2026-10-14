import "server-only";
import { isStaff, type Actor } from "@/server/auth/actor";
import { listRunning } from "@/server/modules/time/service";
import { listNotifications, unreadCount } from "./service";

export interface HeaderNotification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: number;
}

export interface HeaderTimer {
  id: string;
  description: string | null;
  startedAt: number;
  project: { id: string; name: string; color: string } | null;
  task: { id: string; title: string } | null;
}

/** Everything the panel top bar needs (initial render + 60 s polling). */
export async function headerSnapshot(actor: Actor) {
  const items: HeaderNotification[] = listNotifications(actor, 15).map((n) => ({
    id: n.id,
    kind: n.kind,
    title: n.title,
    body: n.body,
    href: n.href,
    read: !!n.readAt,
    createdAt: n.createdAt.getTime(),
  }));
  const running: HeaderTimer[] = isStaff(actor)
    ? (await listRunning(actor)).map((e) => ({
        id: e.id,
        description: e.description,
        startedAt: e.startedAt.getTime(),
        project: e.project ?? null,
        task: e.task ?? null,
      }))
    : [];
  return { unread: unreadCount(actor), items, running, now: Date.now() };
}

export type HeaderSnapshot = Awaited<ReturnType<typeof headerSnapshot>>;
