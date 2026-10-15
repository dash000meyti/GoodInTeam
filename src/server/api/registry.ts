import "server-only";
import { z } from "zod";
import type { Actor } from "@/server/auth/actor";
import { AppError } from "@/server/errors";
import type { ToolDef } from "./define-tool";
import { apiTokensTools } from "@/server/modules/api-tokens/tools";
import { calendarTools } from "@/server/modules/calendar/tools";
import { clientsTools } from "@/server/modules/clients/tools";
import { contractsTools } from "@/server/modules/contracts/tools";
import { financeTools } from "@/server/modules/finance/tools";
import { projectsTools } from "@/server/modules/projects/tools";
import { timeTools } from "@/server/modules/time/tools";
import { tasksTools } from "@/server/modules/tasks/tools";
import { notificationsTools } from "@/server/modules/notifications/tools";
import { settingsTools } from "@/server/modules/settings/tools";
import { usersTools } from "@/server/modules/users/tools";
import { systemTools } from "./system-tools";

/**
 * All tools exposed to AI agents / API clients.
 * Add a module: create src/server/modules/<module>/tools.ts exporting
 * `<module>Tools: ToolDef[]` and spread it here.
 */
export const tools: ToolDef[] = [
  ...systemTools,
  ...projectsTools,
  ...clientsTools,
  ...contractsTools,
  ...timeTools,
  ...tasksTools,
  ...notificationsTools,
  ...settingsTools,
  ...usersTools,
  ...apiTokensTools,
  ...financeTools,
  ...calendarTools,
];

const byName = new Map(tools.map((t) => [t.name, t]));

export function findTool(name: string) {
  return byName.get(name);
}

export function toolsFor(actor: Actor) {
  return tools.filter((t) => !t.roles || t.roles.includes(actor.user.role));
}

export function toolJsonSchema(t: ToolDef) {
  return z.toJSONSchema(t.input, { io: "input", unrepresentable: "any" }) as Record<
    string,
    unknown
  >;
}

/** Validate + authorize + run a tool. Throws AppError on failure. */
export async function callTool(actor: Actor, name: string, args: unknown) {
  const tool = byName.get(name);
  if (!tool) throw new AppError("not_found", `Unknown tool: ${name}`);
  if (tool.roles && !tool.roles.includes(actor.user.role))
    throw new AppError("forbidden", "Your role cannot use this tool");
  if (
    tool.scope === "write" &&
    !actor.scopes.includes("write") &&
    !actor.scopes.includes("admin")
  ) {
    throw new AppError("forbidden", "This token is read-only");
  }
  const parsed = tool.input.safeParse(args ?? {});
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    throw new AppError(
      "validation",
      flat.formErrors[0] ?? "Invalid input",
      flat.fieldErrors as Record<string, string[]>,
    );
  }
  return await tool.handler(parsed.data, actor);
}
