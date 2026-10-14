import { z } from "zod";
import { taskStatuses } from "@/server/db/schema";
import { parseRRule } from "@/lib/rrule";
import { zId, zNullString, zOptString, zTags } from "@/lib/zod-helpers";
import { zOptBool } from "@/server/modules/time/schemas";

export const smartLists = [
  "inbox",
  "today",
  "upcoming",
  "anytime",
  "waiting",
  "someday",
  "done",
] as const;
export type SmartList = (typeof smartLists)[number];

const zPriority = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : Number(v)),
  z.number().int().min(0).max(4).optional(),
);

const zNullInt = z.preprocess(
  (v) => (v === "" || v === null ? null : v === undefined ? undefined : Number(v)),
  z.number().int().min(0).max(100_000).nullable().optional(),
);

const zRecurrence = z.preprocess(
  (v) => (v === "" ? null : v),
  z
    .string()
    .trim()
    .max(300)
    .refine((s) => parseRRule(s) != null, "Invalid RRULE (e.g. FREQ=WEEKLY;BYDAY=SA)")
    .nullable()
    .optional(),
);

/**
 * Task fields. Dates:
 * - dueDate "YYYY-MM-DD" (app timezone) + optional dueTime "HH:mm" (→ dueAllDay=false),
 * - remindAt as ISO instant, or remindDate "YYYY-MM-DD" + remindTime "HH:mm".
 * Send "" (or null) to clear a field on update.
 */
const taskFields = {
  title: z.string().trim().min(1).max(500),
  notes: zNullString(50_000),
  projectId: zNullString(64),
  parentId: zNullString(64),
  status: z.enum(taskStatuses).optional(),
  priority: zPriority,
  dueDate: zNullString(30),
  dueTime: zNullString(8),
  remindAt: zNullString(40),
  remindDate: zNullString(10),
  remindTime: zNullString(8),
  estimateMinutes: zNullInt,
  recurrence: zRecurrence,
  tags: zTags.optional(),
  visibleToClient: zOptBool,
  assigneeId: zNullString(64),
};

export const createTaskInput = z
  .object({
    ...taskFields,
    title: z.string().trim().max(500).optional(),
    /**
     * Quick-add text, e.g. "Renew domain tomorrow 10:30 #personal +good-team-site !3".
     * Parsed fields fill in anything not given explicitly.
     */
    text: zOptString(1000),
  })
  .refine((v) => !!(v.title || v.text), { message: "Title is required", path: ["title"] });

export const updateTaskInput = z.object({
  ...taskFields,
  id: zId,
  title: z.string().trim().min(1).max(500).optional(),
});

export const listTasksInput = z.object({
  /** Smart list; omit to get every open task matching the filters. */
  list: z.enum(smartLists).optional(),
  projectId: zOptString(64),
  priority: zPriority,
  tag: zOptString(50),
  q: zOptString(200),
  /** Include subtasks (default: top-level tasks only). */
  includeSubtasks: zOptBool,
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export const moveTaskInput = z.object({
  id: zId,
  status: z.enum(taskStatuses),
  /** Place before this task in the column (omit → end of column). */
  beforeId: zOptString(64),
});

export const taskIdInput = z.object({ id: zId });

export const addSubtaskInput = z.object({
  parentId: zId,
  title: z.string().trim().min(1).max(500),
});

export const reopenTaskInput = z.object({
  id: zId,
  status: z.enum(taskStatuses).optional(),
  /** Id of the occurrence spawned by completing a recurring task (deleted on undo). */
  spawnedId: zOptString(64),
});
