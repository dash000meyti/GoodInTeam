"use server";

import { refresh } from "next/cache";
import { defineAction, requestLocale } from "@/server/action";
import { requestMeta } from "@/server/auth/request";
import { AppError } from "@/server/errors";
import { getMessages } from "@/i18n/server";
import {
  applyTemplateInput,
  contractInput,
  countersignInput,
  duplicateContractInput,
  idInput,
  installStartersInput,
  saveAsTemplateInput,
  sendContractInput,
  updateContractInput,
  voidContractInput,
} from "./schemas";
import * as svc from "./service";

const ADMIN = ["owner", "admin"] as const;

/** Map business-rule errors to a localized message (or field error) for the panel. */
async function localized<T>(fn: () => T | Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof svc.ContractRuleError) {
      const message = getMessages(await requestLocale()).contracts[`rule_${err.rule}`];
      throw new AppError("validation", message, err.field ? { [err.field]: [message] } : undefined);
    }
    throw err;
  }
}

export const createContractAction = defineAction(
  { input: contractInput, roles: [...ADMIN] },
  (input, actor) =>
    localized(() => {
      const row = svc.createContract(actor, input);
      refresh();
      return { id: row.id, isTemplate: row.isTemplate };
    }),
);

export const updateContractAction = defineAction(
  { input: updateContractInput, roles: [...ADMIN] },
  (input, actor) =>
    localized(() => {
      const row = svc.updateContract(actor, input);
      refresh();
      return {
        id: row.id,
        isTemplate: row.isTemplate,
        reissued: row.reissued,
        version: row.version,
      };
    }),
);

export const sendContractAction = defineAction(
  { input: sendContractInput, roles: [...ADMIN] },
  (input, actor) =>
    localized(() => {
      const res = svc.sendContract(actor, input);
      refresh();
      return res;
    }),
);

export const remindContractAction = defineAction(
  { input: idInput, roles: [...ADMIN] },
  ({ id }, actor) =>
    localized(() => {
      const res = svc.remindContract(actor, id);
      refresh();
      return res;
    }),
);

export const voidContractAction = defineAction(
  { input: voidContractInput, roles: [...ADMIN] },
  (input, actor) =>
    localized(() => {
      svc.voidContract(actor, input);
      refresh();
      return null;
    }),
);

export const deleteContractAction = defineAction(
  { input: idInput, roles: [...ADMIN] },
  ({ id }, actor) =>
    localized(() => {
      svc.deleteContract(actor, id);
      refresh();
      return null;
    }),
);

export const duplicateContractAction = defineAction(
  { input: duplicateContractInput, roles: [...ADMIN] },
  (input, actor) =>
    localized(() => {
      const row = svc.duplicateContract(actor, input);
      refresh();
      return { id: row.id };
    }),
);

export const saveAsTemplateAction = defineAction(
  { input: saveAsTemplateInput, roles: [...ADMIN] },
  (input, actor) =>
    localized(() => {
      const row = svc.saveAsTemplate(actor, input);
      refresh();
      return { id: row.id };
    }),
);

export const installStartersAction = defineAction(
  { input: installStartersInput, roles: [...ADMIN] },
  ({ keys }, actor) => {
    const res = svc.installStarterTemplates(actor, keys);
    refresh();
    return res;
  },
);

/** Render a template for the editor (no write). */
export const applyTemplateAction = defineAction(
  { input: applyTemplateInput, roles: [...ADMIN], write: false },
  (input, actor) => svc.applyTemplate(actor, input),
);

export const countersignContractAction = defineAction(
  { input: countersignInput, roles: [...ADMIN] },
  async (input, actor) => {
    const req = await requestMeta();
    return localized(() => {
      svc.countersignContract(actor, input, req);
      refresh();
      return null;
    });
  },
);
