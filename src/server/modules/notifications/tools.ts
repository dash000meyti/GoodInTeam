import { defineTool } from "@/server/api/define-tool";
import { listNotificationsInput, markReadInput } from "./schemas";
import * as svc from "./service";

export const notificationsTools = [
  defineTool({
    name: "notifications_list",
    title: "List notifications",
    description:
      "The caller's in-app notifications, newest first: kind (e.g. task.reminder, event.reminder, time.long_running), title, body, " +
      "href (panel path), readAt (ISO or null), createdAt (ISO). Also returns the unread count. limit ≤ 100 (default 30).",
    input: listNotificationsInput,
    scope: "read",
    handler: ({ limit, unreadOnly }, actor) => {
      const items = svc.listNotifications(actor, limit ?? 30);
      return {
        unread: svc.unreadCount(actor),
        items: unreadOnly ? items.filter((n) => !n.readAt) : items,
      };
    },
  }),
  defineTool({
    name: "notifications_mark_read",
    title: "Mark notifications read",
    description: "Mark notifications as read by id, or all unread ones when ids is omitted.",
    input: markReadInput,
    scope: "write",
    handler: ({ ids }, actor) => {
      svc.markRead(actor, ids);
      return { unread: svc.unreadCount(actor) };
    },
  }),
];
