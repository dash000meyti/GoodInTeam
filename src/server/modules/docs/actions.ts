"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { defineAction } from "@/server/action";
import { zId } from "@/lib/zod-helpers";
import { archiveDocInput, docInput, moveDocInput, updateDocInput } from "./schemas";
import * as svc from "./service";

/** Portal clients read docs; only staff write. */
const STAFF = ["owner", "admin", "member"] as const;

export const createDocAction = defineAction(
  { input: docInput, roles: [...STAFF] },
  (input, actor) => {
    const row = svc.createDoc(actor, input);
    refresh();
    return { id: row.id };
  },
);

export const updateDocAction = defineAction(
  { input: updateDocInput, roles: [...STAFF] },
  (input, actor) => {
    const row = svc.updateDoc(actor, input);
    refresh();
    return { id: row.id, updatedAt: row.updatedAt };
  },
);

export const moveDocAction = defineAction(
  { input: moveDocInput, roles: [...STAFF] },
  (input, actor) => {
    svc.moveDoc(actor, input);
    refresh();
    return null;
  },
);

export const archiveDocAction = defineAction(
  { input: archiveDocInput, roles: [...STAFF] },
  ({ id, archived }, actor) => {
    svc.setDocArchived(actor, id, archived);
    refresh();
    return null;
  },
);

export const deleteDocAction = defineAction(
  { input: z.object({ id: zId }), roles: [...STAFF] },
  ({ id }, actor) => {
    const res = svc.deleteDoc(actor, id);
    refresh();
    return res;
  },
);
