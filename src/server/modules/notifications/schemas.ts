import { z } from "zod";
import { zId } from "@/lib/zod-helpers";

export const markReadInput = z.object({
  /** Notification ids; omit to mark every unread notification as read. */
  ids: z.array(zId).max(200).optional(),
});

export const listNotificationsInput = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  unreadOnly: z.boolean().optional(),
});
