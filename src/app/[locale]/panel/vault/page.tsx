import type { Metadata } from "next";
import { VaultApp } from "@/components/vault/vault-app";
import { getT } from "@/i18n/server";
import { isAdmin } from "@/server/auth/actor";
import { clientOptions } from "@/server/modules/clients/service";
import { projectOptions } from "@/server/modules/projects/service";
import { getVaultKeys, listVaultItems } from "@/server/modules/vault/service";
import { panelContext } from "@/server/page-context";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t.vault.title };
}

/**
 * Zero-knowledge password vault. The server only hands over wrapped keys and
 * ciphertexts; everything is decrypted in the browser (components/vault).
 * Clients (portal users) are redirected away by panelContext.
 */
export default async function VaultPage() {
  const { actor, fmt } = await panelContext({ roles: ["owner", "admin", "member"] });
  const material = getVaultKeys(actor);
  const items = listVaultItems(actor);
  const projects = projectOptions(actor).map((p) => ({ id: p.id, name: p.name, color: p.color }));
  const clients = isAdmin(actor)
    ? clientOptions(actor).map((c) => ({ id: c.id, name: c.name, color: c.color }))
    : [];
  return (
    <VaultApp
      material={material}
      items={items}
      projects={projects}
      clients={clients}
      account={`${actor.user.name} <${actor.user.email}>`}
      fmt={fmt}
    />
  );
}
