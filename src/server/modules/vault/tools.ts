import { z } from "zod";
import { defineTool } from "@/server/api/define-tool";
import * as svc from "./service";

/**
 * The vault is zero-knowledge: secrets are encrypted in the owner's browser and
 * the server cannot decrypt them. We deliberately expose NO tool that returns
 * secrets, ciphertexts or wrapped keys — an API token must never become a way
 * to exfiltrate the vault (tokens are long-lived, stored in agent configs, and
 * an LLM could be prompt-injected into leaking what it reads).
 * See docs/modules/vault.md#api.
 */
export const vaultTools = [
  defineTool({
    name: "vault_status",
    title: "Vault status",
    description:
      "Whether the caller's zero-knowledge password vault is set up, and how many items it holds per type (login, api_key, ssh_key, database, server, env, card, note, other). Never returns titles, usernames or secrets — those exist only encrypted and can only be viewed by the owner in the browser at /panel/vault.",
    input: z.object({}),
    scope: "read",
    roles: ["owner", "admin", "member"],
    handler: (_input, actor) => svc.vaultStatus(actor),
  }),
];
