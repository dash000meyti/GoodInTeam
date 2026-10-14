import { z } from "zod";
import { defineTool } from "./define-tool";

export const systemTools = [
  defineTool({
    name: "whoami",
    title: "Who am I",
    description:
      "Returns the authenticated user (name, role, locale) and token scopes, plus the server time and timezone. Call this first to understand your permissions.",
    input: z.object({}),
    scope: "read",
    handler: async (_input, actor) => {
      const { appTimezone } = await import("@/server/modules/settings/service");
      return {
        user: actor.user,
        scopes: actor.scopes,
        now: new Date().toISOString(),
        timezone: appTimezone(),
      };
    },
  }),
];
