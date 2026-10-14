"use client";

import { createContext, use, useEffect, useState, type ReactNode } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import type { ProjectOption, TaskOption } from "@/components/time/project-select";
import { EntryDialog, type EntryFormValues } from "./entry-dialog";

interface TimeUI {
  openCreate: (defaults?: Partial<EntryFormValues>) => void;
  openEdit: (values: EntryFormValues) => void;
}

const Ctx = createContext<TimeUI | null>(null);

/**
 * One shared add/edit dialog for the whole page (timeline rows, running
 * cards and timesheet cells open it through `useTimeUI()`).
 */
export function TimeUIProvider({
  projects,
  tasks,
  tz,
  todayKey,
  initialEdit,
  children,
}: {
  projects: ProjectOption[];
  tasks: TaskOption[];
  tz: string;
  /** "YYYY-MM-DD" of today in the app timezone (default date for new entries). */
  todayKey: string;
  /** Open this entry's edit dialog on mount (e.g. from a notification link). */
  initialEdit?: EntryFormValues | null;
  children: ReactNode;
}) {
  const [state, setState] = useState<{
    open: boolean;
    key: number;
    values: EntryFormValues | null;
    defaults: Partial<EntryFormValues>;
  }>({ open: false, key: 0, values: null, defaults: {} });

  useEffect(() => {
    if (initialEdit)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- open once after hydration
      setState((s) => ({ open: true, key: s.key + 1, values: initialEdit, defaults: {} }));
  }, [initialEdit]);

  const api: TimeUI = {
    openCreate: (defaults = {}) =>
      setState((s) => ({ open: true, key: s.key + 1, values: null, defaults })),
    openEdit: (values) => setState((s) => ({ open: true, key: s.key + 1, values, defaults: {} })),
  };

  return (
    <Ctx value={api}>
      {children}
      <EntryDialog
        key={state.key}
        open={state.open}
        onOpenChange={(open) => setState((s) => ({ ...s, open }))}
        entry={state.values}
        defaults={state.defaults}
        projects={projects}
        tasks={tasks}
        tz={tz}
        todayKey={todayKey}
      />
    </Ctx>
  );
}

export function useTimeUI() {
  const v = use(Ctx);
  if (!v) throw new Error("useTimeUI must be used inside <TimeUIProvider>");
  return v;
}

/** "Add time" button that opens the shared dialog. */
export function AddTimeButton({
  defaults,
  variant = "default",
}: {
  defaults?: Partial<EntryFormValues>;
  variant?: "default" | "outline" | "soft";
}) {
  const t = useT();
  const { openCreate } = useTimeUI();
  return (
    <Button variant={variant} onClick={() => openCreate(defaults)}>
      <PlusIcon /> {t.time.addTime}
    </Button>
  );
}
