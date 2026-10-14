"use server";

import { refresh } from "next/cache";
import { defineAction, requestLocale } from "@/server/action";
import { AppError } from "@/server/errors";
import { messages } from "@/i18n/messages";
import {
  entryIdInput,
  entryInput,
  startTimerInput,
  stopTimerInput,
  updateEntryInput,
} from "./schemas";
import * as svc from "./service";

const STAFF = ["owner", "admin", "member"] as const;

/** Run a service call; translate time-input errors into the request locale. */
async function localized<T>(fn: () => T | Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof svc.TimeInputError) {
      const t = messages[await requestLocale()].time;
      const msg = t[`err_${err.key}`];
      const fields = Object.keys(err.fieldErrors ?? {});
      throw new AppError(
        "validation",
        msg,
        fields.length ? Object.fromEntries(fields.map((f) => [f, [msg]])) : undefined,
      );
    }
    throw err;
  }
}

export const startTimerAction = defineAction(
  { input: startTimerInput, roles: [...STAFF] },
  async (input, actor) => {
    const row = await localized(() => svc.startTimer(actor, input));
    refresh();
    return { id: row.id, startedAt: row.startedAt.getTime() };
  },
);

export const stopTimerAction = defineAction(
  { input: stopTimerInput, roles: [...STAFF] },
  async ({ id, endedAt }, actor) => {
    const stopped = await localized(() =>
      id === "all" ? svc.stopAllTimers(actor) : (svc.stopTimer(actor, id, endedAt), 1),
    );
    refresh();
    return { stopped };
  },
);

export const createEntryAction = defineAction(
  { input: entryInput, roles: [...STAFF] },
  async (input, actor) => {
    const row = await localized(() => svc.createEntry(actor, input));
    refresh();
    return { id: row.id };
  },
);

export const updateEntryAction = defineAction(
  { input: updateEntryInput, roles: [...STAFF] },
  async (input, actor) => {
    const row = await localized(() => svc.updateEntry(actor, input));
    refresh();
    return { id: row.id };
  },
);

export const deleteEntryAction = defineAction(
  { input: entryIdInput, roles: [...STAFF] },
  ({ id }, actor) => {
    svc.deleteEntry(actor, id);
    refresh();
    return null;
  },
);

export const continueEntryAction = defineAction(
  { input: entryIdInput, roles: [...STAFF] },
  ({ id }, actor) => {
    const row = svc.continueEntry(actor, id);
    refresh();
    return { id: row.id };
  },
);

export const duplicateEntryAction = defineAction(
  { input: entryIdInput, roles: [...STAFF] },
  ({ id }, actor) => {
    const row = svc.duplicateEntry(actor, id);
    refresh();
    return { id: row.id };
  },
);
