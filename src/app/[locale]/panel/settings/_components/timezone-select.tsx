"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckIcon, ChevronsUpDownIcon, ClockIcon, GlobeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFieldControl } from "@/components/ui/field";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n, useT } from "@/i18n/client";
import { format } from "@/i18n/format-message";
import { formatTime } from "@/lib/format";
import { tzOffset } from "@/lib/tz";
import { cn } from "@/lib/utils";

const POPULAR = [
  "Asia/Tehran",
  "Asia/Dubai",
  "Europe/Istanbul",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
];

/** "UTC+03:30" for a timezone at a given instant. */
function offsetLabel(tz: string, at: number) {
  const mins = Math.round(tzOffset(at, tz) / 60_000);
  const sign = mins < 0 ? "−" : "+";
  const abs = Math.abs(mins);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

const city = (tz: string) => tz.split("/").slice(1).join(" / ").replaceAll("_", " ") || tz;

/**
 * Searchable IANA timezone picker (Intl.supportedValuesOf) with UTC offsets
 * and the live local time. Writes a hidden input for <form action>.
 */
export function TimezoneSelect({ name, defaultValue }: { name: string; defaultValue: string }) {
  const t = useT();
  const { locale } = useI18n();
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  // Inside a <Field>: its label names this combobox.
  const fieldProps = useFieldControl({});

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- start the clock on the client only
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const groups = useMemo(() => {
    if (!open || now == null) return [];
    const all = new Set<string>(Intl.supportedValuesOf("timeZone"));
    all.add("UTC");
    all.add(value);
    const byRegion = new Map<string, string[]>();
    for (const tz of all) {
      const region = tz.includes("/") ? tz.split("/")[0]! : "UTC";
      byRegion.set(region, [...(byRegion.get(region) ?? []), tz]);
    }
    return [
      ["★", POPULAR.filter((tz) => all.has(tz))] as const,
      ...[...byRegion.entries()].sort(([a], [b]) => a.localeCompare(b)),
    ];
  }, [open, now, value]);

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={value} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            {...fieldProps}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="h-10 w-full justify-between rounded-lg px-3 font-normal"
          >
            <span className="flex min-w-0 items-center gap-2" dir="ltr">
              <GlobeIcon className="text-muted-foreground" />
              <span className="truncate">{value}</span>
              {now != null && (
                <span className="text-xs text-muted-foreground">{offsetLabel(value, now)}</span>
              )}
            </span>
            <ChevronsUpDownIcon className="text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) min-w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder={t.settings.timezoneSearch} />
            <CommandList className="max-h-72">
              <CommandEmpty>{t.settings.timezoneEmpty}</CommandEmpty>
              {now != null &&
                groups.map(([region, zones]) => (
                  <CommandGroup key={region} heading={region}>
                    {zones.map((tz) => (
                      <CommandItem
                        key={`${region}:${tz}`}
                        value={`${region}:${tz} ${city(tz)}`}
                        onSelect={() => {
                          setValue(tz);
                          setOpen(false);
                        }}
                        dir="ltr"
                      >
                        <CheckIcon
                          className={cn("size-4", tz === value ? "opacity-100" : "opacity-0")}
                        />
                        <span className="flex-1 truncate">{tz}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {offsetLabel(tz, now)}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {now != null && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ClockIcon className="size-3.5" />
          {format(t.settings.localTimeThere, {
            time: formatTime(now, { locale, timeZone: value }),
          })}
        </p>
      )}
    </div>
  );
}
