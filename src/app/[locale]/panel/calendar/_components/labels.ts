import { digits } from "@/components/calendar/format";
import type { EventStatus } from "@/components/calendar/types";
import { format } from "@/i18n/format-message";
import type { Messages } from "@/i18n/messages";
import type { EventKind } from "@/server/db/schema/work";

type CalMessages = Messages["calendar"];

/** Status options in the vocabulary of the selected kind. */
export function statusOptions(kind: EventKind, c: CalMessages, current?: EventStatus) {
  const list: EventStatus[] =
    kind === "commitment"
      ? ["confirmed", "done", "missed", "canceled"]
      : ["tentative", "confirmed", "done", "canceled"];
  if (current && !list.includes(current)) list.push(current);
  return list.map((s) => ({ value: s, label: statusLabel(kind, s, c) }));
}

export function statusLabel(kind: EventKind, status: EventStatus | string, c: CalMessages) {
  if (kind === "commitment") {
    const map: Record<string, string> = {
      tentative: c.commitment_pending,
      confirmed: c.commitment_pending,
      done: c.commitment_kept,
      missed: c.commitment_missed,
      canceled: c.commitment_canceled,
    };
    return map[status] ?? status;
  }
  return c[`status_${status}` as `status_${EventStatus}`] ?? status;
}

export function reminderLabel(minutes: number, c: CalMessages, locale: "fa" | "en") {
  if (minutes === 0) return c.remind_0;
  if (minutes % 10080 === 0) return format(c.remind_weeks, { n: digits(minutes / 10080, locale) });
  if (minutes % 1440 === 0) return format(c.remind_days, { n: digits(minutes / 1440, locale) });
  if (minutes % 60 === 0) return format(c.remind_hours, { n: digits(minutes / 60, locale) });
  return format(c.remind_minutes, { n: digits(minutes, locale) });
}
