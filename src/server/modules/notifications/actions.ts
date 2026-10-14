"use server";

import { z } from "zod";
import { defineAction } from "@/server/action";
import { headerSnapshot } from "./header";
import { markReadInput } from "./schemas";
import * as svc from "./service";

/** Polled by the panel header every 60 s (read-only). */
export const pollHeaderAction = defineAction(
  { input: z.object({}), write: false },
  (_input, actor) => headerSnapshot(actor),
);

/**
 * Mark notifications as read. No refresh(): the bell updates optimistically,
 * so the page the user is on doesn't re-render.
 */
export const markNotificationsReadAction = defineAction(
  { input: markReadInput },
  ({ ids }, actor) => {
    svc.markRead(actor, ids);
    return { unread: svc.unreadCount(actor) };
  },
);
