import { defineTool } from "@/server/api/define-tool";
import type { Lead } from "@/server/db/schema";
import { listLeadsInput, updateLeadStatusInput } from "./schemas";
import * as svc from "./service";

const ADMIN = ["owner", "admin"] as const;

/** Tools never expose the submitter's IP / user agent. */
function publicLead(lead: Lead) {
  const out: Partial<Lead> = { ...lead };
  delete out.ip;
  delete out.userAgent;
  return out;
}

export const leadsTools = [
  defineTool({
    name: "leads_list",
    title: "List leads",
    description:
      "Contact-form submissions from the public website (name, email, company, requested service slug, budget range key, message, locale, status). Filter by status (new | contacted | qualified | won | lost | spam) or free-text q.",
    input: listLeadsInput,
    scope: "read",
    roles: [...ADMIN],
    handler: (input, actor) => svc.listLeads(actor, input).map(publicLead),
  }),
  defineTool({
    name: "leads_update_status",
    title: "Update lead status",
    description:
      "Move a lead through the pipeline: new → contacted → qualified → won / lost (or spam).",
    input: updateLeadStatusInput,
    scope: "write",
    roles: [...ADMIN],
    handler: (input, actor) => publicLead(svc.updateLeadStatus(actor, input)),
  }),
];
