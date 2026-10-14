"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { defineAction } from "@/server/action";
import { zId } from "@/lib/zod-helpers";
import {
  importVaultItemsInput,
  resetVaultInput,
  setupVaultInput,
  updateVaultItemInput,
  updateVaultKeysInput,
  vaultItemFavoriteInput,
  vaultItemInput,
} from "./schemas";
import * as svc from "./service";

/** Every staff user has a personal vault; portal clients never do. */
const STAFF = ["owner", "admin", "member"] as const;

export const setupVaultAction = defineAction(
  { input: setupVaultInput, roles: [...STAFF] },
  (input, actor) => {
    svc.setupVault(actor, input);
    refresh();
    return null;
  },
);

export const updateVaultKeysAction = defineAction(
  { input: updateVaultKeysInput, roles: [...STAFF] },
  (input, actor) => {
    svc.updateVaultKeys(actor, input);
    refresh();
    return null;
  },
);

export const resetVaultAction = defineAction(
  { input: resetVaultInput, roles: [...STAFF] },
  (_input, actor) => {
    svc.resetVault(actor);
    refresh();
    return null;
  },
);

export const createVaultItemAction = defineAction(
  { input: vaultItemInput, roles: [...STAFF] },
  (input, actor) => {
    const row = svc.createVaultItem(actor, input);
    refresh();
    return row;
  },
);

export const updateVaultItemAction = defineAction(
  { input: updateVaultItemInput, roles: [...STAFF] },
  (input, actor) => {
    const row = svc.updateVaultItem(actor, input);
    refresh();
    return row;
  },
);

export const deleteVaultItemAction = defineAction(
  { input: z.object({ id: zId }), roles: [...STAFF] },
  ({ id }, actor) => {
    svc.deleteVaultItem(actor, id);
    refresh();
    return null;
  },
);

export const favoriteVaultItemAction = defineAction(
  { input: vaultItemFavoriteInput, roles: [...STAFF] },
  ({ id, favorite }, actor) => {
    svc.setVaultItemFavorite(actor, id, favorite);
    refresh();
    return null;
  },
);

/** Fire-and-forget "last viewed" stamp — no refresh, nothing visible changes. */
export const viewVaultItemAction = defineAction(
  { input: z.object({ id: zId }), roles: [...STAFF] },
  ({ id }, actor) => {
    svc.markVaultItemViewed(actor, id);
    return null;
  },
);

export const importVaultItemsAction = defineAction(
  { input: importVaultItemsInput, roles: [...STAFF] },
  (input, actor) => {
    const res = svc.importVaultItems(actor, input);
    refresh();
    return res;
  },
);
