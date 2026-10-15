import { z } from "zod";
import { defineTool } from "@/server/api/define-tool";
import { zId } from "@/lib/zod-helpers";
import { clientInput, listClientsInput, updateClientInput } from "./schemas";
import * as svc from "./service";

const ADMIN = ["owner", "admin"] as const;

export const clientsTools = [
  defineTool({
    name: "clients_list",
    title: "List clients",
    description:
      "List clients/teams/people (counterparties) with their project counts. Optional free-text q.",
    input: listClientsInput,
    scope: "read",
    roles: [...ADMIN],
    handler: (input, actor) => svc.listClients(actor, input),
  }),
  defineTool({
    name: "clients_get",
    title: "Get client",
    description: "Client details with their projects and portal users.",
    input: z.object({ id: zId }),
    scope: "read",
    roles: [...ADMIN],
    handler: ({ id }, actor) => svc.getClient(actor, id),
  }),
  defineTool({
    name: "clients_create",
    title: "Create client",
    description: "Create a client (kind: company | team | person).",
    input: clientInput,
    scope: "write",
    roles: [...ADMIN],
    handler: (input, actor) => svc.createClient(actor, input),
  }),
  defineTool({
    name: "clients_update",
    title: "Update client",
    description:
      "Update client fields (partial: only the fields you send change; null clears optional fields). defaultCurrency must be a supported code.",
    input: updateClientInput,
    scope: "write",
    roles: [...ADMIN],
    handler: (input, actor) => svc.updateClient(actor, input),
  }),
];
