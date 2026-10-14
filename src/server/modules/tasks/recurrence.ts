/**
 * Pure helper: when a recurring task is completed, when is the next one due?
 *
 * The next occurrence is the first one after max(current due, end of today),
 * so completing an overdue weekly task jumps to the upcoming week instead of
 * spawning another overdue copy, and completing early skips this occurrence.
 */
import { nextOccurrence, parseRRule } from "@/lib/rrule";
import { addDays, startOfDay } from "@/lib/tz";

export interface RecurringTaskLike {
  dueAt: Date | null;
  remindAt: Date | null;
  recurrence: string | null;
}

export function nextTaskOccurrence(
  task: RecurringTaskLike,
  opts: { now: number; tz: string },
): { dueAt: Date | null; remindAt: Date | null } | null {
  if (!task.recurrence) return null;
  const rule = parseRRule(task.recurrence);
  if (!rule) return null;
  const today = startOfDay(opts.now, opts.tz);
  const anchor = task.dueAt ?? task.remindAt ?? today;
  const endOfToday = addDays(today, 1, opts.tz).getTime() - 1;
  const after = new Date(Math.max(anchor.getTime(), endOfToday));
  const next = nextOccurrence(rule, anchor, after, opts.tz);
  if (!next) return null;
  const shift = next.getTime() - anchor.getTime();
  if (!task.dueAt && !task.remindAt) return { dueAt: next, remindAt: null };
  return {
    dueAt: task.dueAt ? next : null,
    remindAt: task.remindAt ? new Date(task.remindAt.getTime() + shift) : null,
  };
}
