import "server-only";
import type { Actor } from "@/server/auth/actor";
import {
  listStarterTemplates,
  listTemplates,
  signerSuggestions,
} from "@/server/modules/contracts/service";
import { projectOptions } from "@/server/modules/projects/service";
import type { EditorClient, EditorProject } from "./contract-editor";
import type { PickableTemplate } from "./template-picker";

/** Lookup data shared by the "new" and "edit" pages. */
export function editorData(actor: Actor, locale: "fa" | "en") {
  const clients: EditorClient[] = signerSuggestions(actor).map((c) => ({
    id: c.id,
    name: c.name,
    signerName: c.signerName,
    signerEmail: c.signerEmail,
  }));
  const projects: EditorProject[] = projectOptions(actor).map((p) => ({
    id: p.id,
    name: p.name,
    clientId: p.clientId,
  }));
  const templates: PickableTemplate[] = listTemplates(actor).map((tpl) => ({
    id: tpl.id,
    title: tpl.title,
    kind: tpl.kind,
    locale: tpl.locale,
    summary: tpl.excerpt,
  }));
  const starters: PickableTemplate[] = listStarterTemplates()
    .sort((a, b) => Number(b.locale === locale) - Number(a.locale === locale))
    .map((s) => ({
      starter: s.key,
      title: s.title,
      kind: s.kind,
      locale: s.locale,
      summary: s.summary,
    }));
  return { clients, projects, templates, starters };
}
