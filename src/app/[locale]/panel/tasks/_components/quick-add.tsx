"use client";

import { useMemo, useState, useTransition, type Ref } from "react";
import {
  AlertCircleIcon,
  CalendarIcon,
  ClockIcon,
  CornerDownLeftIcon,
  FlagIcon,
  HashIcon,
  Loader2Icon,
  PlusIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ColorDot } from "@/components/shared/color-dot";
import type { ProjectOption } from "@/components/time/project-select";
import { localeMeta } from "@/i18n/config";
import { format } from "@/i18n/format-message";
import { useLocale, useT } from "@/i18n/client";
import { formatDayLabel } from "@/lib/day-label";
import { toPersianDigits } from "@/lib/format";
import { parseQuickAdd } from "@/lib/quick-add";
import { cn } from "@/lib/utils";
import { createTaskAction } from "@/server/modules/tasks/actions";
import type { TaskStatus } from "@/server/db/schema/work";
import type { SmartListKey } from "./lists";
import { priorityTone } from "./task-bits";

/** Same resolution order as the server: exact slug → slug prefix → name contains. */
export function matchProject(projects: ProjectOption[], slug: string) {
  const s = slug.toLowerCase();
  return (
    projects.find((p) => p.slug === s) ??
    projects.find((p) => p.slug?.startsWith(s)) ??
    projects.find((p) => p.name.toLowerCase().includes(s)) ??
    null
  );
}

const listDefaults: Partial<Record<SmartListKey, TaskStatus>> = {
  inbox: "inbox",
  anytime: "todo",
  waiting: "waiting",
  someday: "someday",
};

/** Quick-add input with live preview chips of parsed priority/tags/project/date/time. */
export function QuickAdd({
  projects,
  tz,
  now,
  list,
  todayKey,
  filterProjectId,
  ref,
}: {
  projects: ProjectOption[];
  tz: string;
  now: number;
  list: SmartListKey;
  todayKey: string;
  filterProjectId: string;
  ref?: Ref<HTMLInputElement>;
}) {
  const t = useT();
  const tk = t.tasks;
  const locale = useLocale();
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const parsed = useMemo(
    () => (text.trim() ? parseQuickAdd(text, { now, tz }) : null),
    [text, now, tz],
  );
  const project = parsed?.project ? matchProject(projects, parsed.project) : null;
  const fmt = { locale, timeZone: tz, calendar: localeMeta[locale].calendar };

  const submit = () => {
    if (!parsed || !(parsed.title || text.trim())) return;
    start(async () => {
      const payload: Record<string, unknown> = { text };
      const status = listDefaults[list];
      if (status) payload.status = status;
      if (list === "today" && !parsed.dueDate) payload.dueDate = todayKey;
      if (filterProjectId && filterProjectId !== "_none" && !parsed.project)
        payload.projectId = filterProjectId;
      const res = await createTaskAction(payload);
      if (res.ok) {
        toast.success(tk.created, { description: res.data.title });
        setText("");
      } else toast.error(res.error.message);
    });
  };

  const chip = (key: string, icon: React.ReactNode, label: React.ReactNode, className?: string) => (
    <span
      key={key}
      className={cn(
        "inline-flex animate-in items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs font-semibold zoom-in-95 fade-in",
        className,
      )}
    >
      {icon}
      {label}
    </span>
  );

  const chips = parsed
    ? parsed.tokens.map((tok, i) => {
        const key = `${tok.kind}-${i}`;
        switch (tok.kind) {
          case "priority":
            return chip(
              key,
              <FlagIcon className={cn("size-3 fill-current", priorityTone[Number(tok.value)])} />,
              tk[`priority_${tok.value}` as "priority_1"],
            );
          case "tag":
            return chip(key, <HashIcon className="size-3 text-info" />, tok.value, "text-info");
          case "project":
            return project
              ? chip(key, <ColorDot color={project.color} className="size-2" />, project.name)
              : chip(
                  key,
                  <AlertCircleIcon className="size-3" />,
                  format(tk.projectNotFound, { slug: tok.value }),
                  "bg-warning/16 text-[#b76e00] dark:text-warning",
                );
          case "date":
            return chip(
              key,
              <CalendarIcon className="size-3 text-primary" />,
              formatDayLabel(new Date(`${tok.value}T12:00:00Z`), { ...fmt, timeZone: "UTC" }),
            );
          case "time":
            return chip(
              key,
              <ClockIcon className="size-3 text-primary" />,
              <span dir="ltr">{locale === "fa" ? toPersianDigits(tok.value) : tok.value}</span>,
            );
        }
      })
    : [];

  return (
    <Card className="gap-0 p-0">
      <form
        className="flex items-center gap-3 px-4 py-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <PlusIcon className="size-5 shrink-0 text-primary" />
        <input
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={tk.quickAddPlaceholder}
          aria-label={tk.quickAddLabel}
          aria-describedby="quick-add-hint"
          className="h-12 min-w-0 flex-1 bg-transparent text-base font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground"
        />
        <Button
          type="submit"
          size="sm"
          disabled={pending || !text.trim()}
          className={cn(!text.trim() && "invisible")}
          aria-label={t.common.add}
        >
          {pending ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <CornerDownLeftIcon className="rtl:-scale-x-100" />
          )}
          <span className="hidden sm:inline">{t.common.add}</span>
        </Button>
      </form>
      <div
        id="quick-add-hint"
        className="flex min-h-9 flex-wrap items-center gap-1.5 border-t border-dashed px-4 py-2"
      >
        {chips.length ? (
          <>
            {parsed?.title && (
              <span className="me-1 max-w-full truncate text-xs text-muted-foreground">
                <bdi>{parsed.title}</bdi>
              </span>
            )}
            {chips}
          </>
        ) : (
          <span className="text-xs text-muted-foreground">{tk.quickAddHint}</span>
        )}
      </div>
    </Card>
  );
}
