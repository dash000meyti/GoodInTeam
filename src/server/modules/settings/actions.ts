"use server";

import { refresh, updateTag } from "next/cache";
import { defineAction } from "@/server/action";
import { localized } from "@/server/modules/users/localize";
import { businessFormInput, profileFormInput, type ProfilePatch } from "./schemas";
import * as svc from "./service";
import { unflatten } from "./utils";

const ADMIN = ["owner", "admin"] as const;

/** Settings → Site profile. Public pages read the profile → refresh their cache. */
export const updateProfileAction = defineAction(
  { input: profileFormInput, roles: [...ADMIN] },
  (input, actor) =>
    localized(() => {
      svc.updateProfile(actor, unflatten(input) as ProfilePatch);
      updateTag("content");
      refresh();
      return null;
    }),
);

/** Settings → Business (currency, timezone, invoicing defaults). */
export const updateBusinessAction = defineAction(
  { input: businessFormInput, roles: [...ADMIN] },
  (input, actor) =>
    localized(() => {
      const { "paymentInstructions.fa": fa, "paymentInstructions.en": en, ...rest } = input;
      svc.updateBusiness(actor, { ...rest, paymentInstructions: { fa, en } });
      updateTag("content");
      refresh();
      return null;
    }),
);
