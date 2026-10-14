"use server";

import { refresh } from "next/cache";
import { defineAction } from "@/server/action";
import { localized } from "./localize";
import {
  inviteTeamUserInput,
  setUserDisabledInput,
  setUserRoleInput,
  updateAccountInput,
  userIdInput,
} from "./schemas";
import * as svc from "./service";

const ADMIN = ["owner", "admin"] as const;

/** Settings → My account (every signed-in user). */
export const updateAccountAction = defineAction({ input: updateAccountInput }, (input, actor) =>
  localized(() => {
    const row = svc.updateAccount(actor, input);
    refresh();
    return { locale: row.locale, localeChanged: row.locale !== actor.user.locale };
  }),
);

export const inviteTeamUserAction = defineAction(
  { input: inviteTeamUserInput, roles: [...ADMIN] },
  (input, actor) =>
    localized(async () => {
      const res = await svc.inviteTeamUser(actor, input);
      refresh();
      return res;
    }),
);

export const setUserRoleAction = defineAction(
  { input: setUserRoleInput, roles: [...ADMIN] },
  (input, actor) =>
    localized(() => {
      svc.setUserRole(actor, input);
      refresh();
      return null;
    }),
);

export const setUserDisabledAction = defineAction(
  { input: setUserDisabledInput, roles: [...ADMIN] },
  ({ id, disabled }, actor) =>
    localized(() => {
      svc.setUserDisabled(actor, id, disabled);
      refresh();
      return null;
    }),
);

export const resetUserPasswordAction = defineAction(
  { input: userIdInput, roles: [...ADMIN] },
  ({ id }, actor) =>
    localized(async () => {
      const res = await svc.resetUserPassword(actor, id);
      refresh();
      return res;
    }),
);

export const deleteUserAction = defineAction(
  { input: userIdInput, roles: [...ADMIN] },
  ({ id }, actor) =>
    localized(() => {
      svc.deleteUser(actor, id);
      refresh();
      return null;
    }),
);
