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

/** Hairlines between square cells: every cell draws its end + bottom line (frame cells). */
const LINE = "border-e border-b border-frame-line last:border-e-0";
/** The sticky project column covers what scrolls under it with the box surface. */
const STICKY = "sticky start-0 z-10 bg-background";

/**
 * Project × day grid, edge to edge in its framed box: square cells sharing
 * hairlines (no rounding), today's column tinted. Cells open the add-time
 * dialog prefilled with day + project; the grid scrolls inside its box on
 * narrow screens with the project column pinned.
 */
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
        className="group/cell flex h-12 w-full cursor-pointer items-center justify-center font-mono text-sm tabular-nums transition-colors outline-none hover:bg-primary/8 focus-visible:bg-primary/8 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        {content}
      </button>
    ) : (
      <div className="flex h-12 items-center justify-center font-mono text-sm tabular-nums">
        {content}
      </div>
    );

  const plus = (
    <PlusIcon className="size-4 text-muted-foreground/0 transition-colors group-hover/cell:text-primary-ink group-focus-visible/cell:text-primary-ink" />
  );

  return (
    <div className="scrollbar-thin overflow-x-auto">
      <table className="w-full min-w-[680px] border-separate border-spacing-0 text-sm sm:min-w-[760px]">
        <thead>
          <tr>
            <th
              className={cn(
                LINE,
                STICKY,
                "w-36 px-(--cell-pad) py-3 text-start text-xs font-bold text-muted-foreground sm:w-56",
              )}
            >
              {t.common.project}
            </th>
            {days.map((d) => (
              <th
                key={d.key}
                className={cn(
                  LINE,
                  "px-1 py-2.5 text-center text-xs font-semibold text-muted-foreground",
                  d.today && "bg-primary/4 text-primary-ink",
                )}
              >
                <span className="block">{d.weekday}</span>
                <span
                  className={cn(
                    "mt-1 inline-block px-1.5 text-[11px] font-bold",
                    d.today && "bg-primary text-primary-foreground",
                  )}
                >
                  {d.label}
                </span>
              </th>
            ))}
            <th
              className={cn(
                LINE,
                "w-24 px-4 py-3 text-center text-xs font-bold text-muted-foreground",
              )}
            >
              {t.common.total}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.projectId ?? "_none"} className="group">
              <td className={cn(LINE, STICKY, "max-w-36 px-(--cell-pad) py-1 sm:max-w-56")}>
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
                  className={cn(LINE, "p-0", days[i]!.today && "bg-primary/4")}
                >
                  {cell(
                    days[i]!,
                    row,
                    c.ms ? <span className="font-semibold">{c.label}</span> : plus,
                  )}
                </td>
              ))}
              <td className={cn(LINE, "px-4 text-center font-mono font-bold tabular-nums")}>
                {row.total}
              </td>
            </tr>
          ))}
          {editable && (
            <tr>
              <td
                className={cn(
                  LINE,
                  STICKY,
                  "px-(--cell-pad) py-1 text-xs font-semibold text-muted-foreground",
                )}
              >
                <span className="flex items-center gap-2">
                  <PlusIcon className="size-3.5" /> {tt.addTime}
                </span>
              </td>
              {days.map((d) => (
                <td key={d.key} className={cn(LINE, "p-0", d.today && "bg-primary/4")}>
                  {cell(d, null, plus)}
                </td>
              ))}
              <td className={LINE} />
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td
              className={cn(
                "sticky start-0 z-10 border-e border-frame-line bg-card px-(--cell-pad) py-3 text-xs font-bold",
              )}
            >
              {t.common.total}
            </td>
            {dayTotals.map((v, i) => (
              <td
                key={days[i]!.key}
                className="border-e border-frame-line bg-card py-3 text-center font-mono text-sm font-bold tabular-nums"
              >
                {v}
              </td>
            ))}
            <td className="bg-card py-3 text-center font-mono text-base font-black text-primary-ink tabular-nums">
              {total}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
