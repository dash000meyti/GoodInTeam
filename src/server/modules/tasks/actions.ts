"use server";

import { refresh } from "next/cache";
import { defineAction } from "@/server/action";
import {
  addSubtaskInput,
  createTaskInput,
  moveTaskInput,
  reopenTaskInput,
  taskIdInput,
  updateTaskInput,
} from "./schemas";
import * as svc from "./service";

const STAFF = ["owner", "admin", "member"] as const;

export const createTaskAction = defineAction(
  { input: createTaskInput, roles: [...STAFF] },
  (input, actor) => {
    const row = svc.createTask(actor, input);
    refresh();
    return { id: row.id, title: row.title };
  },
);

export const updateTaskAction = defineAction(
  { input: updateTaskInput, roles: [...STAFF] },
  (input, actor) => {
    const row = svc.updateTask(actor, input);
    refresh();
    return { id: row.id, nextId: row.nextId };
  },
);

export const completeTaskAction = defineAction(
  { input: taskIdInput, roles: [...STAFF] },
  ({ id }, actor) => {
    const { nextId } = svc.completeTask(actor, id);
    refresh();
    return { nextId };
  },
);

export const reopenTaskAction = defineAction(
  { input: reopenTaskInput, roles: [...STAFF] },
  (input, actor) => {
    svc.reopenTask(actor, input);
    refresh();
    return null;
  },
);

export const moveTaskAction = defineAction(
  { input: moveTaskInput, roles: [...STAFF] },
  (input, actor) => {
    const res = svc.moveTask(actor, input);
    refresh();
    return res;
  },
);

export const deleteTaskAction = defineAction(
  { input: taskIdInput, roles: [...STAFF] },
  ({ id }, actor) => {
    svc.deleteTask(actor, id);
    refresh();
    return null;
  },
);

export const addSubtaskAction = defineAction(
  { input: addSubtaskInput, roles: [...STAFF] },
  (input, actor) => {
    const row = svc.addSubtask(actor, input);
    refresh();
    return { id: row.id };
  },
);

export const startTaskTimerAction = defineAction(
  { input: taskIdInput, roles: [...STAFF] },
  ({ id }, actor) => {
    const entry = svc.startTaskTimer(actor, id);
    refresh();
    return { entryId: entry.id };
  },
);

/** Read-only: full task for the detail sheet. */
export const getTaskAction = defineAction(
  { input: taskIdInput, roles: [...STAFF], write: false },
  ({ id }, actor) => svc.getTask(actor, id),
);
