import { defineTool } from "@/server/api/define-tool";
import { listUsersInput } from "./schemas";
import * as svc from "./service";

/**
 * Read-only on purpose: inviting, role changes, disabling, password resets
 * and deletions stay in the UI (Settings → Team) where a human confirms them.
 */
export const usersTools = [
  defineTool({
    name: "users_list",
    title: "List users",
    description:
      "List every account (team: owner/admin/member; client-portal users with their client), with status (disabled), last login, assigned projects and active session count. Never includes password hashes. Optional filter by role; includeDisabled defaults to true.",
    input: listUsersInput,
    scope: "read",
    roles: ["owner", "admin"],
    handler: (input, actor) => svc.listUsers(actor, input),
  }),
];
