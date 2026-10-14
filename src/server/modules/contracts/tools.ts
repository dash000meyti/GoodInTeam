import { z } from "zod";
import { defineTool } from "@/server/api/define-tool";
import {
  contractInput,
  duplicateContractInput,
  idInput,
  installStartersInput,
  listContractsInput,
  saveAsTemplateInput,
  sendContractInput,
  updateContractInput,
  voidContractInput,
} from "./schemas";
import * as svc from "./service";

const ADMIN = ["owner", "admin"] as const;

export const contractsTools = [
  defineTool({
    name: "contracts_list",
    title: "List contracts",
    description:
      "List contracts, proposals, NDAs, approvals and change requests (no body text, no signature images). " +
      "Filter by status: draft | sent | viewed | signed | declined | void | expired, or the groups " +
      "'awaiting' (sent/viewed and not expired) and 'closed' (declined/void/expired). Also clientId, projectId, " +
      "free-text q (title). `effectiveStatus` already accounts for expiry. Clients only see their own sent documents.",
    input: listContractsInput,
    scope: "read",
    roles: ["owner", "admin", "client"],
    handler: (input, actor) => svc.listContracts(actor, input),
  }),
  defineTool({
    name: "contracts_get",
    title: "Get contract",
    description:
      "Full document: markdown body, status, version, contentHash (sha256 of the body) and whether it still verifies, " +
      "the signing URL (if sent), unfilled {{placeholders}}, the audit trail (events with IP/user agent) and signatures " +
      "(name, typed name, IP, time, version). Drawn signature images are never returned — only drawnSignature.present.",
    input: idInput,
    scope: "read",
    roles: [...ADMIN],
    handler: ({ id }, actor) => svc.getContractForApi(actor, id),
  }),
  defineTool({
    name: "contracts_list_templates",
    title: "List contract templates",
    description:
      "Saved templates (id, title, kind, language, placeholders used) plus built-in `starters` " +
      "(keys usable as `starter` in contracts_create). Built-in placeholders: client.name, client.email, client.phone, " +
      "client.address, project.name, project.budget, project.startDate, project.dueDate, owner.name, brand.name, today. " +
      "Any other {{key}} can be filled with `values` when creating.",
    input: z.object({}),
    scope: "read",
    roles: [...ADMIN],
    handler: (_input, actor) => ({
      templates: svc.listTemplates(actor),
      starters: svc.listStarterTemplates(),
    }),
  }),
  defineTool({
    name: "contracts_create",
    title: "Create contract",
    description:
      "Create a DRAFT document (or a template with isTemplate=true). Either pass `bodyMd` (markdown) or start from " +
      "`templateId` / `starter` (body and title default to the template's). Placeholders like {{client.name}} are " +
      'filled from clientId/projectId and settings; extra keys via `values` (e.g. {"milestone.title": "Phase 2"}). ' +
      "kind: contract | proposal | nda | approval | change_request. requireSignature=false means a simple " +
      "'I approve' acknowledgement. expiresAt is a day 'YYYY-MM-DD' (app timezone). Returns the row and any " +
      "still-unfilled placeholders. Use contracts_send afterwards to get the signing link.",
    input: contractInput,
    scope: "write",
    roles: [...ADMIN],
    handler: (input, actor) => svc.createContract(actor, input),
  }),
  defineTool({
    name: "contracts_update",
    title: "Update contract",
    description:
      "Edit a document (partial). Drafts/templates change freely. For a sent/viewed/declined/expired document, " +
      "changing title, bodyMd or requireSignature issues a NEW VERSION (version+1, new contentHash, status back to " +
      "'sent'): the signer must review and sign again (same link). Metadata-only changes (expiresAt, signer, links) " +
      "keep the version. Signed and void documents are immutable (use contracts_duplicate).",
    input: updateContractInput,
    scope: "write",
    roles: [...ADMIN],
    handler: (input, actor) => svc.updateContract(actor, input),
  }),
  defineTool({
    name: "contracts_send",
    title: "Send contract (get signing link)",
    description:
      "Draft → sent: pins the text (contentHash + version), creates the private signing link and returns `signUrl` " +
      "to share with the signer (no email is sent). Optional expiresAt 'YYYY-MM-DD'. For an already sent/viewed " +
      "document it just returns the existing link.",
    input: sendContractInput,
    scope: "write",
    roles: [...ADMIN],
    handler: (input, actor) => svc.sendContract(actor, input),
  }),
  defineTool({
    name: "contracts_remind",
    title: "Log a reminder",
    description:
      "Record a reminder in the audit trail for a sent/viewed document and return its signing link to re-share.",
    input: idInput,
    scope: "write",
    roles: [...ADMIN],
    handler: ({ id }, actor) => svc.remindContract(actor, id),
  }),
  defineTool({
    name: "contracts_void",
    title: "Void contract",
    description:
      "Void a sent/viewed/declined/expired document: the signing link stops working. Audit trail is kept. " +
      "Signed documents cannot be voided.",
    input: voidContractInput,
    scope: "write",
    roles: [...ADMIN],
    destructive: true,
    handler: (input, actor) => svc.voidContract(actor, input),
  }),
  defineTool({
    name: "contracts_duplicate",
    title: "Duplicate contract",
    description:
      "Copy any document (or template) into a new DRAFT. asNewVersion=true keeps the same title — use it to change " +
      "a signed contract (signed documents themselves never change).",
    input: duplicateContractInput,
    scope: "write",
    roles: [...ADMIN],
    handler: (input, actor) => svc.duplicateContract(actor, input),
  }),
  defineTool({
    name: "contracts_save_as_template",
    title: "Save as template",
    description:
      "Create a reusable template either from an existing document ({id}) or from {title, kind, bodyMd, " +
      "requireSignature}. Keep {{placeholders}} in the body so they are filled on use.",
    input: saveAsTemplateInput,
    scope: "write",
    roles: [...ADMIN],
    handler: (input, actor) => svc.saveAsTemplate(actor, input),
  }),
  defineTool({
    name: "contracts_install_starters",
    title: "Install starter templates",
    description:
      "Add the built-in starter templates (Persian software-development contract and milestone acceptance, English " +
      "equivalents) as editable templates. Optional `keys` to pick specific starters. Skips ones already present.",
    input: installStartersInput,
    scope: "write",
    roles: [...ADMIN],
    handler: ({ keys }, actor) => svc.installStarterTemplates(actor, keys),
  }),
  defineTool({
    name: "contracts_delete",
    title: "Delete draft or template",
    description:
      "Permanently delete a DRAFT document or a template. Sent documents can't be deleted (void them instead).",
    input: idInput,
    scope: "write",
    roles: [...ADMIN],
    destructive: true,
    handler: ({ id }, actor) => {
      svc.deleteContract(actor, id);
      return { deleted: true };
    },
  }),
];
