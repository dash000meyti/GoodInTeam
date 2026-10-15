import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { localeMeta, type Locale } from "@/i18n/config";
import { format } from "@/i18n/format-message";
import { messages } from "@/i18n/messages";
import { formatDate, formatDateTime, formatTime, type FormatOptions } from "@/lib/format";
import { db } from "@/server/db/client";
import { notifications, users } from "@/server/db/schema";
import { notify } from "@/server/modules/notifications/service";
import { appTimezone } from "@/server/modules/settings/service";
import { dueTaskReminders, markTaskReminded } from "@/server/modules/tasks/service";
import { LONG_RUNNING_MS } from "@/server/modules/time/calc";
import { longRunningEntries } from "@/server/modules/time/service";

function localesOf(ids: (string | null)[]) {
  const list = [...new Set(ids.filter((x): x is string => !!x))];
  if (!list.length) return new Map<string, Locale>();
  return new Map(
    db
      .select({ id: users.id, locale: users.locale })
      .from(users)
      .where(inArray(users.id, list))
      .all()
      .map((u) => [u.id, u.locale as Locale]),
  );
}

function fmtFor(locale: Locale, tz: string): FormatOptions {
  return { locale, timeZone: tz, calendar: localeMeta[locale].calendar };
}

/** Tasks: remindAt ≤ now and not yet reminded → notify assignee (or creator). */
export function runTaskReminders(now = Date.now()) {
  const due = dueTaskReminders(now);
  if (!due.length) return 0;
  const tz = appTimezone();
  const locales = localesOf(due.map((t) => t.userId));
  for (const t of due) {
    if (t.userId) {
      const locale = locales.get(t.userId) ?? "fa";
      const m = messages[locale].notifications;
      const fmt = fmtFor(locale, tz);
      notify(t.userId, {
        kind: "task.reminder",
        title: t.title,
        body: t.dueAt
          ? format(m.taskReminderDue, {
              due: t.dueAllDay ? formatDate(t.dueAt, fmt) : formatDateTime(t.dueAt, fmt),
            })
          : m.taskReminder,
        href: `/panel/tasks?task=${t.id}`,
      });
    }
    markTaskReminded(t.id, now);
  }
  return due.length;
}

/**
 * Event reminders (one-off and recurring, once per occurrence) live in the
 * calendar module next to the RRULE expansion.
 */
export { runEventReminders } from "@/server/modules/calendar/service";

/** Running timers > 10 h: one "forgot to stop?" notification per entry. */
export function runLongRunningCheck() {
  const list = longRunningEntries(LONG_RUNNING_MS);
  if (!list.length) return 0;
  const tz = appTimezone();
  const locales = localesOf(list.map((e) => e.userId));
  let sent = 0;
  for (const e of list) {
    const href = `/panel/time?entry=${e.id}`;
    const already = db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, e.userId),
          eq(notifications.kind, "time.long_running"),
          eq(notifications.href, href),
        ),
      )
      .get();
    if (already) continue;
    const locale = locales.get(e.userId) ?? "fa";
    const m = messages[locale].notifications;
    const name =
      e.description || e.projectName || formatTime(e.startedAt, fmtFor(locale, tz)) || "—";
    notify(e.userId, {
      kind: "time.long_running",
      title: m.longRunningTitle,
      body: format(m.longRunningBody, { name }),
      href,
    });
    sent++;
  }
  return sent;
}
