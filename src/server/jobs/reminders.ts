import "server-only";
import { and, eq, gt, inArray, isNotNull, isNull, notInArray, sql } from "drizzle-orm";
import { localeMeta, type Locale } from "@/i18n/config";
import { format } from "@/i18n/format-message";
import { messages } from "@/i18n/messages";
import { formatDate, formatDateTime, formatTime, type FormatOptions } from "@/lib/format";
import { db } from "@/server/db/client";
import { events, notifications, users } from "@/server/db/schema";
import { notify } from "@/server/modules/notifications/service";
import { appTimezone } from "@/server/modules/settings/service";
import { dueTaskReminders, markTaskReminded } from "@/server/modules/tasks/service";
import { LONG_RUNNING_MS } from "@/server/modules/time/calc";
import { longRunningEntries } from "@/server/modules/time/service";

/** Event reminders for events that started longer ago than this are skipped. */
const STALE_EVENT_MS = 6 * 3_600_000;

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
 * Events with `remindMinutesBefore`: notify the creator once start − minutes ≤ now.
 * Only non-recurring events for now (recurring expansion is a TODO, see docs).
 */
export function runEventReminders(now = Date.now()) {
  const due = db
    .select({
      id: events.id,
      title: events.title,
      startAt: events.startAt,
      allDay: events.allDay,
      createdBy: events.createdBy,
    })
    .from(events)
    .where(
      and(
        isNotNull(events.remindMinutesBefore),
        isNull(events.remindedAt),
        isNull(events.recurrence),
        notInArray(events.status, ["canceled", "done", "missed"]),
        sql`${events.startAt} - ${events.remindMinutesBefore} * 60000 <= ${now}`,
        gt(events.startAt, new Date(now - STALE_EVENT_MS)),
      ),
    )
    .limit(200)
    .all();
  if (!due.length) return 0;
  const tz = appTimezone();
  const locales = localesOf(due.map((e) => e.createdBy));
  for (const ev of due) {
    if (ev.createdBy) {
      const locale = locales.get(ev.createdBy) ?? "fa";
      const fmt = fmtFor(locale, tz);
      notify(ev.createdBy, {
        kind: "event.reminder",
        title: ev.title,
        body: format(messages[locale].notifications.eventReminder, {
          when: ev.allDay ? formatDate(ev.startAt, fmt) : formatDateTime(ev.startAt, fmt),
        }),
        href: `/panel/calendar?event=${ev.id}`,
      });
    }
    db.update(events)
      .set({ remindedAt: new Date(now) })
      .where(eq(events.id, ev.id))
      .run();
  }
  return due.length;
}

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
