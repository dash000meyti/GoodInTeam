import { z } from "zod";
import { defineTool } from "@/server/api/define-tool";
import { listTokens } from "./service";

export const apiTokensTools = [
  defineTool({
    name: "api_tokens_list",
    title: "List my API tokens",
    description:
      "Your own active API tokens: name, visible prefix (gt_…), scopes (read / write), lastUsedAt, expiresAt (null = never), createdAt. Secrets and hashes are never returned; create or revoke tokens in Panel → Settings → API & AI agents.",
    input: z.object({}),
    scope: "read",
    roles: ["owner", "admin", "member"],
    handler: (_input, actor) => listTokens(actor),
  }),
];
