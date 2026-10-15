import { z } from "zod";
import { docVisibilities } from "@/server/db/schema";
import { zId, zNullString, zOptString } from "@/lib/zod-helpers";

export const docInput = z.object({
  title: z.string().trim().min(1).max(200),
  /** A single emoji (or short text) shown before the title. */
  icon: zNullString(16),
  contentMd: z.string().max(500_000).default(""),
  parentId: zNullString(64),
  projectId: zNullString(64),
  clientId: zNullString(64),
  /**
   * private = only the author · team = all staff · client = staff + portal users of
   * the linked project's client (when the project shares docs) or of the linked client.
   */
  visibility: z.enum(docVisibilities).default("private"),
});
export type DocInput = z.input<typeof docInput>;

export const updateDocInput = docInput.partial().extend({ id: zId });

export const listDocsInput = z.object({
  projectId: zOptString(64),
  visibility: z.enum(docVisibilities).optional(),
  /** tree = nested `children`; flat = one list ordered by position. */
  format: z.enum(["tree", "flat"]).default("tree"),
  archived: z.boolean().optional(),
});

export const searchDocsInput = z.object({
  q: z.string().trim().min(1).max(200),
  projectId: zOptString(64),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/** Place a page under `parentId` (null = top level) at position `index` among its siblings. */
export const moveDocInput = z.object({
  id: zId,
  parentId: zNullString(64),
  index: z.coerce.number().int().min(0).max(10_000),
});

export const archiveDocInput = z.object({ id: zId, archived: z.boolean() });
