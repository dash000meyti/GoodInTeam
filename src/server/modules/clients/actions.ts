"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { defineAction } from "@/server/action";
import { zId } from "@/lib/zod-helpers";
import { clientInput, inviteClientUserInput, updateClientInput } from "./schemas";
import * as svc from "./service";

const ADMIN = ["owner", "admin"] as const;

export const createClientAction = defineAction(
  { input: clientInput, roles: [...ADMIN] },
  (input, actor) => {
    const row = svc.createClient(actor, input);
    refresh();
    return { id: row.id };
  },
);

export const updateClientAction = defineAction(
  { input: updateClientInput, roles: [...ADMIN] },
  (input, actor) => {
    svc.updateClient(actor, input);
    refresh();
    return { id: input.id };
  },
);

export const archiveClientAction = defineAction(
  { input: z.object({ id: zId, archived: z.boolean() }), roles: [...ADMIN] },
  ({ id, archived }, actor) => {
    svc.setClientArchived(actor, id, archived);
    refresh();
    return null;
  },
);

export const deleteClientAction = defineAction(
  { input: z.object({ id: zId }), roles: [...ADMIN] },
  ({ id }, actor) => {
    svc.deleteClient(actor, id);
    refresh();
    return null;
  },
);

export const inviteClientUserAction = defineAction(
  { input: inviteClientUserInput, roles: [...ADMIN] },
  async (input, actor) => {
    const res = await svc.inviteClientUser(actor, input);
    refresh();
    return res;
  },
);

export const removeClientUserAction = defineAction(
  { input: z.object({ userId: zId }), roles: [...ADMIN] },
  ({ userId }, actor) => {
    svc.removeClientUser(actor, userId);
    refresh();
    return null;
  },
);
