"use client";

import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAction } from "@/components/shared/use-action-form";
import type { CalendarConfig } from "@/components/calendar/grid";
import type { CalendarEventData } from "@/components/calendar/types";
import type { Locale } from "@/i18n/config";
import { useT } from "@/i18n/client";
import type { EventKind } from "@/server/db/schema/work";
import { deleteEventAction } from "@/server/modules/calendar/actions";
import { EventFormDialog } from "./event-form";

export interface ProjectOption {
  id: string;
  name: string;
  color: string;
  clientId: string | null;
}

export interface ClientOption {
  id: string;
  name: string;
  color: string | null;
}

/** Values to pre-fill when creating an event (from a clicked day/slot). */
export interface EventPrefill {
  date?: string;
  startTime?: string;
  endTime?: string;
  allDay?: boolean;
  kind?: EventKind;
  projectId?: string;
}

export type EventDialogState =
  { mode: "create"; prefill: EventPrefill } | { mode: "edit"; event: CalendarEventData } | null;

type DeleteTarget = Pick<CalendarEventData, "id" | "title" | "recurrence">;

interface CalendarContextValue extends CalendarConfig {
  locale: Locale;
  todayKey: string;
  /** Server time at render (avoid Date.now() during render). */
  now: number;
  isAdmin: boolean;
  projects: ProjectOption[];
  clients: ClientOption[];
  openCreate: (prefill?: EventPrefill) => void;
  openEdit: (event: CalendarEventData) => void;
  /** Ask for confirmation, then delete (whole series for recurring events). */
  requestDelete: (event: DeleteTarget) => void;
}

const Ctx = createContext<CalendarContextValue | null>(null);

export function useCalendar() {
  const v = use(Ctx);
  if (!v) throw new Error("useCalendar must be used inside <CalendarProvider>");
  return v;
}

/** Shared calendar state: config, picker options, the create/edit dialog and delete confirm. */
export function CalendarProvider({
  children,
  tz,
  calendar,
  weekStartsOn,
  locale,
  todayKey,
  now,
  isAdmin,
  projects,
  clients,
}: Omit<CalendarContextValue, "openCreate" | "openEdit" | "requestDelete"> & {
  children: ReactNode;
}) {
  const t = useT();
  const [dialog, setDialog] = useState<EventDialogState>(null);
  const [toDelete, setToDelete] = useState<DeleteTarget | null>(null);
  const { exec } = useAction();
  const openCreate = useCallback(
    (prefill: EventPrefill = {}) => setDialog({ mode: "create", prefill }),
    [],
  );
  const openEdit = useCallback(
    (event: CalendarEventData) => setDialog({ mode: "edit", event }),
    [],
  );
  const requestDelete = useCallback((event: DeleteTarget) => setToDelete(event), []);
  const ctx = useMemo(
    () => ({
      tz,
      calendar,
      weekStartsOn,
      locale,
      todayKey,
      now,
      isAdmin,
      projects,
      clients,
      openCreate,
      openEdit,
      requestDelete,
    }),
    [
      tz,
      calendar,
      weekStartsOn,
      locale,
      todayKey,
      now,
      isAdmin,
      projects,
      clients,
      openCreate,
      openEdit,
      requestDelete,
    ],
  );
  return (
    <Ctx value={ctx}>
      {children}
      <EventFormDialog state={dialog} onClose={() => setDialog(null)} />
      <AlertDialog open={toDelete !== null} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.common.deleteConfirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?.title && <b className="text-foreground">{toDelete.title}</b>}{" "}
              {toDelete?.recurrence ? t.calendar.deleteRecurringHint : t.calendar.deleteHint}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!toDelete) return;
                exec(deleteEventAction({ id: toDelete.id }), t.calendar.deleted);
                setDialog((d) => (d?.mode === "edit" && d.event.id === toDelete.id ? null : d));
              }}
            >
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Ctx>
  );
}
