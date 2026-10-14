"use client";

import { FlagIcon, HashIcon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ColorDot } from "@/components/shared/color-dot";
import { SelectField } from "@/components/shared/select-field";
import type { ProjectOption } from "@/components/time/project-select";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { emptyFilters, type Filters } from "./lists";
import { priorityTone } from "./task-bits";

const ALL = "__all__";

/** Search + project / priority / tag filters (client-side, instant). */
export function TaskFilters({
  value,
  onChange,
  projects,
  tags,
}: {
  value: Filters;
  onChange: (next: Filters) => void;
  projects: ProjectOption[];
  tags: string[];
}) {
  const t = useT();
  const tk = t.tasks;
  const active = Object.values(value).some(Boolean);
  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch });
  const fromSelect = (v: string) => (v === ALL ? "" : v);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative min-w-0 flex-1 basis-full sm:basis-52">
        <SearchIcon className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
        <input
          type="search"
          value={value.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder={tk.searchPlaceholder}
          aria-label={t.common.search}
          className="h-9 w-full rounded-lg border border-input bg-transparent ps-9 pe-3 text-sm transition-colors outline-none placeholder:text-muted-foreground hover:border-foreground/40 focus-visible:border-foreground"
        />
      </label>
      <SelectField
        value={value.projectId || ALL}
        onChange={(v) => set({ projectId: fromSelect(v) })}
        size="sm"
        className={cn("h-9 w-[calc(50%-0.25rem)] sm:w-44", value.projectId && "border-primary/50")}
        options={[
          { value: ALL, label: tk.allProjects },
          { value: "_none", label: tk.noProjectFilter, icon: <ColorDot /> },
          ...projects.map((p) => ({
            value: p.id,
            label: <span className="truncate">{p.name}</span>,
            icon: <ColorDot color={p.color} />,
          })),
        ]}
      />
      <SelectField
        value={value.priority || ALL}
        onChange={(v) => set({ priority: fromSelect(v) })}
        size="sm"
        className={cn("h-9 w-[calc(50%-0.25rem)] sm:w-36", value.priority && "border-primary/50")}
        options={[
          { value: ALL, label: tk.allPriorities },
          ...[4, 3, 2, 1, 0].map((p) => ({
            value: String(p),
            label: tk[`priority_${p}` as "priority_0"],
            icon: (
              <FlagIcon className={cn("size-3.5", p >= 3 && "fill-current", priorityTone[p])} />
            ),
          })),
        ]}
      />
      {tags.length > 0 && (
        <SelectField
          value={value.tag || ALL}
          onChange={(v) => set({ tag: fromSelect(v) })}
          size="sm"
          className={cn("h-9 w-[calc(50%-0.25rem)] sm:w-36", value.tag && "border-primary/50")}
          options={[
            { value: ALL, label: tk.allTags },
            ...tags.map((tag) => ({
              value: tag,
              label: tag,
              icon: <HashIcon className="size-3.5 text-info" />,
            })),
          ]}
        />
      )}
      {active && (
        <Button variant="ghost" size="sm" className="h-9" onClick={() => onChange(emptyFilters)}>
          <XIcon /> {tk.clearFilters}
        </Button>
      )}
    </div>
  );
}
