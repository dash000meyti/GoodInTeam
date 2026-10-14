"use client";

import { PlusIcon } from "lucide-react";
import { ColorDot } from "@/components/shared/color-dot";
import { format } from "@/i18n/format-message";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { useTimeUI } from "./time-ui";

export interface TimesheetDay {
  key: string;
  weekday: string;
  label: string;
  today: boolean;
}

export interface TimesheetRow {
  projectId: string | null;
  name: string | null;
  color: string | null;
  cells: { ms: number; label: string }[];
  total: string;
}

/** Project × day grid. Cells open the add-time dialog prefilled with day + project. */
export function TimesheetGrid({
  days,
  rows,
  dayTotals,
  total,
  editable,
}: {
  days: TimesheetDay[];
  rows: TimesheetRow[];
  dayTotals: string[];
  total: string;
  editable: boolean;
}) {
  const t = useT();
  const tt = t.time;
  const { openCreate } = useTimeUI();

  const cell = (day: TimesheetDay, row: TimesheetRow | null, content: React.ReactNode) =>
    editable ? (
      <button
        type="button"
        onClick={() => openCreate({ date: day.key, projectId: row?.projectId ?? "" })}
        aria-label={format(tt.addTimeFor, { day: `${day.weekday} ${day.label}` })}
        className="group/cell flex h-11 w-full cursor-pointer items-center justify-center rounded-lg font-mono text-sm tabular-nums transition-colors hover:bg-primary/8 focus-visible:bg-primary/8 focus-visible:outline-none"
      >
        {content}
      </button>
    ) : (
      <div className="flex h-11 items-center justify-center font-mono text-sm tabular-nums">
        {content}
      </div>
    );

  const plus = (
    <PlusIcon className="size-4 text-muted-foreground/0 transition-colors group-hover/cell:text-primary group-focus-visible/cell:text-primary" />
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] border-separate border-spacing-0 text-sm sm:min-w-[760px]">
        <thead>
          <tr>
            <th className="sticky start-0 z-10 w-36 bg-card px-4 py-3 text-start text-xs font-bold text-muted-foreground sm:w-56 sm:px-6">
              {t.common.project}
            </th>
            {days.map((d) => (
              <th
                key={d.key}
                className={cn(
                  "px-1 py-3 text-center text-xs font-semibold text-muted-foreground",
                  d.today && "text-primary",
                )}
              >
                <span className="block">{d.weekday}</span>
                <span
                  className={cn(
                    "mt-1 inline-block rounded-md px-1.5 text-[11px] font-bold",
                    d.today && "bg-primary text-primary-foreground",
                  )}
                >
                  {d.label}
                </span>
              </th>
            ))}
            <th className="w-24 px-4 py-3 text-center text-xs font-bold text-muted-foreground">
              {t.common.total}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.projectId ?? "_none"} className="group">
              <td className="sticky start-0 z-10 max-w-36 border-t border-dashed bg-card px-4 py-1 sm:max-w-56 sm:px-6">
                <span className="flex items-center gap-2 font-semibold">
                  <ColorDot color={row.color} />
                  <span className="truncate">
                    <bdi>{row.name ?? t.common.noProject}</bdi>
                  </span>
                </span>
              </td>
              {row.cells.map((c, i) => (
                <td
                  key={days[i]!.key}
                  className={cn("border-t border-dashed p-1", days[i]!.today && "bg-primary/4")}
                >
                  {cell(
                    days[i]!,
                    row,
                    c.ms ? <span className="font-semibold">{c.label}</span> : plus,
                  )}
                </td>
              ))}
              <td className="border-t border-dashed px-4 text-center font-mono font-bold tabular-nums">
                {row.total}
              </td>
            </tr>
          ))}
          {editable && (
            <tr>
              <td className="sticky start-0 z-10 border-t border-dashed bg-card px-4 py-1 text-xs font-semibold text-muted-foreground sm:px-6">
                <span className="flex items-center gap-2">
                  <PlusIcon className="size-3.5" /> {tt.addTime}
                </span>
              </td>
              {days.map((d) => (
                <td
                  key={d.key}
                  className={cn("border-t border-dashed p-1", d.today && "bg-primary/4")}
                >
                  {cell(d, null, plus)}
                </td>
              ))}
              <td className="border-t border-dashed" />
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr className="bg-muted">
            <td className="sticky start-0 z-10 bg-muted px-4 py-3 text-xs font-bold sm:px-6">
              {t.common.total}
            </td>
            {dayTotals.map((v, i) => (
              <td
                key={days[i]!.key}
                className="py-3 text-center font-mono text-sm font-bold tabular-nums"
              >
                {v}
              </td>
            ))}
            <td className="py-3 text-center font-mono text-base font-black text-primary tabular-nums">
              {total}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
