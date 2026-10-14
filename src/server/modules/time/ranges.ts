/**
 * Report range presets (pure). Weeks start Saturday (fa) / Monday (en);
 * months are Jalali for fa. `to` is exclusive; `toKey` is the inclusive last day.
 */
import {
  addDays,
  calendarFor,
  fromDateInput,
  startOfDay,
  startOfMonth,
  startOfNextMonth,
  startOfWeek,
  toDateInputValue,
  weekStartFor,
} from "@/lib/tz";

export const rangePresets = [
  "this_week",
  "last_week",
  "this_month",
  "last_month",
  "last_30",
  "custom",
] as const;
export type RangePreset = (typeof rangePresets)[number];

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function resolveRange(
  input: { preset?: string; from?: string; to?: string },
  opts: { now: number; tz: string; locale: "fa" | "en" },
) {
  const { now, tz, locale } = opts;
  const today = startOfDay(now, tz);
  const week = startOfWeek(now, tz, weekStartFor(locale));
  const month = startOfMonth(now, tz, calendarFor(locale));
  let preset = (rangePresets as readonly string[]).includes(input.preset ?? "")
    ? (input.preset as RangePreset)
    : "this_week";

  let from: Date;
  let to: Date;
  switch (preset) {
    case "last_week":
      from = addDays(week, -7, tz);
      to = week;
      break;
    case "this_month":
      from = month;
      to = startOfNextMonth(now, tz, calendarFor(locale));
      break;
    case "last_month":
      from = startOfMonth(addDays(month, -1, tz), tz, calendarFor(locale));
      to = month;
      break;
    case "last_30":
      from = addDays(today, -29, tz);
      to = addDays(today, 1, tz);
      break;
    case "custom":
      if (input.from && input.to && DAY_RE.test(input.from) && DAY_RE.test(input.to)) {
        from = fromDateInput(input.from, undefined, tz);
        to = addDays(fromDateInput(input.to, undefined, tz), 1, tz);
        if (to <= from) [from, to] = [addDays(to, -1, tz), addDays(from, 1, tz)];
        break;
      }
      preset = "this_week";
      from = week;
      to = addDays(week, 7, tz);
      break;
    default:
      from = week;
      to = addDays(week, 7, tz);
  }
  return {
    preset,
    from,
    to,
    fromKey: toDateInputValue(from, tz),
    toKey: toDateInputValue(addDays(to, -1, tz), tz),
  };
}
