import { z } from "zod";
import { zId, zNullString, zOptInt, zOptString, zTags } from "@/lib/zod-helpers";

/** Optional boolean that keeps `undefined` (unlike zBool, which turns "missing" into false). */
export const zOptBool = z.preprocess(
  (v) =>
    v === undefined || v === null || v === ""
      ? undefined
      : v === true || v === "on" || v === "true" || v === "1",
  z.boolean().optional(),
);

/** Day "YYYY-MM-DD" (app timezone) or an ISO instant. */
const zDayOrIso = zOptString(40);

export const startTimerInput = z.object({
  description: zOptString(500),
  projectId: zOptString(64),
  taskId: zOptString(64),
  /** Default: true when the project is billable (billingType ≠ internal), else false. */
  billable: zOptBool,
  tags: zTags.optional(),
});

export const stopTimerInput = z.object({
  /** Entry id, or "all" to stop every running timer of the caller. */
  id: z.string().min(1).max(64),
  /** Optional ISO instant to stop at (default: now). */
  endedAt: zOptString(40),
});

/** Times: see `resolveEntryTimes` in calc.ts for the accepted combinations. */
const timeFields = {
  startedAt: zOptString(40),
  endedAt: zOptString(40),
  date: zOptString(10),
  startTime: zOptString(8),
  endTime: zOptString(8),
  duration: zOptString(30),
};

export const entryInput = z.object({
  description: zOptString(500),
  projectId: zOptString(64),
  taskId: zOptString(64),
  billable: zOptBool,
  tags: zTags.optional(),
  ...timeFields,
});

export const updateEntryInput = z.object({
  id: zId,
  description: zNullString(500),
  projectId: zNullString(64),
  taskId: zNullString(64),
  billable: zOptBool,
  tags: zTags.optional(),
  ...timeFields,
});

export const entryIdInput = z.object({ id: zId });

export const listEntriesInput = z.object({
  from: zDayOrIso,
  to: zDayOrIso,
  projectId: zOptString(64),
  /** Admins only: a user id or "all" (default: yourself). */
  userId: zOptString(64),
  limit: zOptInt,
});

export const reportInput = z.object({
  /** "YYYY-MM-DD" inclusive, app timezone. */
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** "YYYY-MM-DD" inclusive, app timezone. */
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  projectId: zOptString(64),
  userId: zOptString(64),
});
