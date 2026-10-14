"use client";

import { useMemo, useState } from "react";
import * as g from "date-fns";
import * as j from "date-fns-jalali";
import { enUS } from "date-fns/locale";
import { faIR } from "date-fns-jalali/locale";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/i18n/client";
import { toPersianDigits } from "@/lib/format";
import { cn } from "@/lib/utils";

/** "YYYY-MM-DD" (Gregorian, calendar-day, no timezone) ⇄ local Date at noon. */
export function parseDateValue(v: string | null | undefined) {
  if (!v) return null;
  const [y, m, d] = v.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12);
}
export function toDateValue(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Calendar-aware date picker: Jalali (Solar Hijri) for `fa`, Gregorian for `en`.
 * Always emits a Gregorian "YYYY-MM-DD" string — via `onChange` and, when
 * `name` is set, a hidden input so it works inside <form action>.
 */
export function DatePicker({
  name,
  value: controlled,
  defaultValue,
  onChange,
  placeholder,
  clearable = true,
  className,
  id,
}: {
  name?: string;
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (value: string | null) => void;
  placeholder?: string;
  clearable?: boolean;
  className?: string;
  id?: string;
}) {
  const { locale, dir } = useI18n();
  const jalali = locale === "fa";
  const lib = (jalali ? j : g) as typeof j;
  // Gregorian formatting needs date-fns' own enUS (date-fns-jalali's enUS has Jalali month names).
  const loc = (jalali ? faIR : enUS) as typeof faIR;
  const fmt = (d: Date, pattern: string) => {
    const s = lib.format(d, pattern, { locale: loc });
    return jalali ? toPersianDigits(s) : s;
  };
  const weekStartsOn = jalali ? 6 : 1;

  const [inner, setInner] = useState<string | null>(defaultValue ?? null);
  const value = controlled !== undefined ? controlled : inner;
  const selected = parseDateValue(value);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<Date>(() => selected ?? new Date());

  const days = useMemo(() => {
    const start = lib.startOfWeek(lib.startOfMonth(month), { weekStartsOn });
    const end = lib.endOfWeek(lib.endOfMonth(month), { weekStartsOn });
    return lib.eachDayOfInterval({ start, end });
  }, [lib, month, weekStartsOn]);

  const weekdayLabels = days.slice(0, 7).map((d) => fmt(d, "EEEEEE"));

  const set = (d: Date | null) => {
    const v = d ? toDateValue(d) : null;
    if (controlled === undefined) setInner(v);
    onChange?.(v);
  };

  const Prev = dir === "rtl" ? ChevronRightIcon : ChevronLeftIcon;
  const Next = dir === "rtl" ? ChevronLeftIcon : ChevronRightIcon;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {name && <input type="hidden" name={name} value={value ?? ""} />}
      <div className={cn("relative", className)}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn(
              "h-10 w-full justify-start rounded-lg px-3 font-normal",
              !selected && "text-muted-foreground",
            )}
          >
            <CalendarIcon className="text-muted-foreground" />
            {selected ? fmt(selected, "d MMMM yyyy") : (placeholder ?? "—")}
          </Button>
        </PopoverTrigger>
        {clearable && selected && (
          <button
            type="button"
            onClick={() => set(null)}
            className="absolute inset-y-0 end-2 my-auto flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
            aria-label="clear"
          >
            <XIcon className="size-3.5" />
          </button>
        )}
      </div>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="mb-2 flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setMonth(lib.addMonths(month, -1))}
          >
            <Prev />
          </Button>
          <span className="text-sm font-bold">{fmt(month, "MMMM yyyy")}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setMonth(lib.addMonths(month, 1))}
          >
            <Next />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {weekdayLabels.map((w, i) => (
            <span key={i} className="py-1 text-[11px] font-semibold text-muted-foreground">
              {w}
            </span>
          ))}
          {days.map((d) => {
            const inMonth = lib.isSameMonth(d, month);
            const isSel = selected && lib.isSameDay(d, selected);
            const isToday = lib.isToday(d);
            return (
              <button
                key={d.toISOString()}
                type="button"
                onClick={() => {
                  set(d);
                  setOpen(false);
                }}
                className={cn(
                  "flex size-9 cursor-pointer items-center justify-center rounded-lg text-sm transition-colors hover:bg-accent",
                  !inMonth && "text-muted-foreground/50",
                  isToday && !isSel && "font-bold text-primary",
                  isSel && "bg-primary font-bold text-primary-foreground hover:bg-primary-dark",
                )}
              >
                {fmt(d, "d")}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between border-t border-dashed pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              set(new Date());
              setMonth(new Date());
              setOpen(false);
            }}
          >
            {locale === "fa" ? "امروز" : "Today"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
