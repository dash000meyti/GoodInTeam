"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { defineAction } from "@/server/action";
import { zId } from "@/lib/zod-helpers";
import { createToken, createTokenInput, revokeToken } from "./service";

const STAFF = ["owner", "admin", "member"] as const;

export const createTokenAction = defineAction(
  { input: createTokenInput, roles: [...STAFF] },
  (input, actor) => {
    const res = createToken(actor, input);
    refresh();
    return res;
  },
);

export const revokeTokenAction = defineAction(
  { input: z.object({ id: zId }), roles: [...STAFF] },
  ({ id }, actor) => {
    revokeToken(actor, id);
    refresh();
    return null;
  },
);
