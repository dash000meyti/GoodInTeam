import type { LucideIcon } from "lucide-react";
import {
  BracesIcon,
  CreditCardIcon,
  DatabaseIcon,
  GlobeIcon,
  KeyRoundIcon,
  ServerIcon,
  ShapesIcon,
  StickyNoteIcon,
  TerminalIcon,
} from "lucide-react";

/**
 * Client-side model of vault items. Everything here describes the DECRYPTED
 * payload, which only ever exists in the browser's memory.
 */

/** Display order (most used first). Mirrors `vaultItemTypes` in the DB schema. */
export const VAULT_ITEM_TYPES = [
  "login",
  "server",
  "database",
  "api_key",
  "ssh_key",
  "env",
  "card",
  "note",
  "other",
] as const;
export type VaultItemType = (typeof VAULT_ITEM_TYPES)[number];

export type FieldKind =
  "text" | "url" | "secret" | "multiline" | "secretMultiline" | "totp" | "select" | "port";

export interface FieldDef {
  key: FieldKey;
  kind: FieldKind;
  /** Offer the password generator next to the input. */
  generator?: boolean;
  /** Included in client-side search. */
  searchable?: boolean;
  options?: readonly string[];
  placeholder?: string;
}

export type FieldKey =
  | "url"
  | "username"
  | "password"
  | "totp"
  | "notes"
  | "service"
  | "key"
  | "secret"
  | "host"
  | "user"
  | "privateKey"
  | "passphrase"
  | "engine"
  | "port"
  | "database"
  | "connectionString"
  | "panelUrl"
  | "holder"
  | "number"
  | "expiry"
  | "cvv"
  | "note";

export const DB_ENGINES = [
  "PostgreSQL",
  "MySQL",
  "MariaDB",
  "MongoDB",
  "Redis",
  "SQLite",
  "SQL Server",
  "Other",
] as const;

const notes: FieldDef = { key: "notes", kind: "multiline" };

export const TYPE_FIELDS: Record<VaultItemType, FieldDef[]> = {
  login: [
    { key: "url", kind: "url", searchable: true, placeholder: "https://" },
    { key: "username", kind: "text", searchable: true },
    { key: "password", kind: "secret", generator: true },
    { key: "totp", kind: "totp", placeholder: "otpauth://totp/… / JBSWY3DPEHPK3PXP" },
    notes,
  ],
  server: [
    { key: "host", kind: "text", searchable: true, placeholder: "203.0.113.10" },
    { key: "user", kind: "text", searchable: true, placeholder: "root" },
    { key: "password", kind: "secret", generator: true },
    { key: "panelUrl", kind: "url", searchable: true, placeholder: "https://" },
    notes,
  ],
  database: [
    { key: "engine", kind: "select", options: DB_ENGINES },
    { key: "host", kind: "text", searchable: true, placeholder: "localhost" },
    { key: "port", kind: "port", placeholder: "5432" },
    { key: "database", kind: "text", searchable: true },
    { key: "user", kind: "text", searchable: true },
    { key: "password", kind: "secret", generator: true },
    { key: "connectionString", kind: "secret", placeholder: "postgres://user:pass@host:5432/db" },
    notes,
  ],
  api_key: [
    { key: "service", kind: "text", searchable: true },
    { key: "key", kind: "secret" },
    { key: "secret", kind: "secret" },
    notes,
  ],
  ssh_key: [
    { key: "host", kind: "text", searchable: true, placeholder: "git.example.com" },
    { key: "user", kind: "text", searchable: true, placeholder: "deploy" },
    {
      key: "privateKey",
      kind: "secretMultiline",
      placeholder: "-----BEGIN OPENSSH PRIVATE KEY-----",
    },
    { key: "passphrase", kind: "secret", generator: true },
    notes,
  ],
  env: [notes],
  card: [
    { key: "holder", kind: "text", searchable: true },
    { key: "number", kind: "secret", placeholder: "6037 •••• •••• ••••" },
    { key: "expiry", kind: "text", placeholder: "MM/YY" },
    { key: "cvv", kind: "secret" },
    notes,
  ],
  note: [{ key: "note", kind: "multiline" }],
  other: [notes],
};

export const TYPE_ICONS: Record<VaultItemType, LucideIcon> = {
  login: GlobeIcon,
  server: ServerIcon,
  database: DatabaseIcon,
  api_key: KeyRoundIcon,
  ssh_key: TerminalIcon,
  env: BracesIcon,
  card: CreditCardIcon,
  note: StickyNoteIcon,
  other: ShapesIcon,
};

/** Tile colours per type (soft surfaces, consistent with Badge tones). */
export const TYPE_TONES: Record<VaultItemType, string> = {
  login: "bg-primary/12 text-primary-dark dark:text-primary-light",
  server: "bg-info/14 text-[#006c9c] dark:text-[#61f3f3]",
  database: "bg-violet/14 text-[#5119b7] dark:text-[#c684ff]",
  api_key: "bg-warning/16 text-[#b76e00] dark:text-[#ffd666]",
  ssh_key: "bg-grey-500/16 text-grey-700 dark:text-grey-300",
  env: "bg-success/14 text-[#118d57] dark:text-[#77ed8b]",
  card: "bg-destructive/12 text-[#b71d18] dark:text-[#ffac82]",
  note: "bg-warning/16 text-[#b76e00] dark:text-[#ffd666]",
  other: "bg-grey-500/16 text-grey-700 dark:text-grey-300",
};

export interface CustomField {
  label: string;
  value: string;
  concealed: boolean;
}

export interface EnvPair {
  key: string;
  value: string;
}

/** The encrypted JSON document (versioned). */
export interface VaultPayload {
  v: 1;
  type: VaultItemType;
  title: string;
  fields: Partial<Record<FieldKey, string>>;
  custom: CustomField[];
  env: EnvPair[];
}

/** Row as delivered by the server (no plaintext). */
export interface VaultItemRecord {
  id: string;
  type: VaultItemType;
  projectId: string | null;
  clientId: string | null;
  favorite: boolean;
  ciphertext: string;
  iv: string;
  lastViewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** A decrypted item in memory. `payload` is null when decryption failed. */
export interface VaultEntry extends Omit<VaultItemRecord, "ciphertext" | "iv"> {
  payload: VaultPayload | null;
}

export function isVaultItemType(v: unknown): v is VaultItemType {
  return typeof v === "string" && (VAULT_ITEM_TYPES as readonly string[]).includes(v);
}

export function emptyPayload(type: VaultItemType): VaultPayload {
  return { v: 1, type, title: "", fields: {}, custom: [], env: [] };
}

const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));

/** Defensive parse of a decrypted document (never trust shapes, even our own). */
export function normalizePayload(raw: unknown, fallbackType: VaultItemType): VaultPayload {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const type = isVaultItemType(o.type) ? o.type : fallbackType;
  const fields: Partial<Record<FieldKey, string>> = {};
  if (o.fields && typeof o.fields === "object") {
    for (const [k, v] of Object.entries(o.fields as Record<string, unknown>)) {
      const s = str(v);
      if (s) fields[k as FieldKey] = s;
    }
  }
  const custom = Array.isArray(o.custom)
    ? o.custom
        .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
        .map((c) => ({ label: str(c.label), value: str(c.value), concealed: !!c.concealed }))
    : [];
  const env = Array.isArray(o.env)
    ? o.env
        .filter((c): c is Record<string, unknown> => !!c && typeof c === "object")
        .map((c) => ({ key: str(c.key), value: str(c.value) }))
    : [];
  return { v: 1, type, title: str(o.title), fields, custom, env };
}

/** Strip empty values before encrypting. */
export function cleanPayload(p: VaultPayload): VaultPayload {
  const fields: Partial<Record<FieldKey, string>> = {};
  const allowed = new Set(TYPE_FIELDS[p.type].map((f) => f.key));
  for (const [k, v] of Object.entries(p.fields)) {
    if (v && v.trim() && allowed.has(k as FieldKey)) fields[k as FieldKey] = v;
  }
  return {
    v: 1,
    type: p.type,
    title: p.title.trim(),
    fields,
    custom: p.custom.filter((c) => c.label.trim() || c.value),
    env: p.type === "env" ? p.env.filter((e) => e.key.trim()) : [],
  };
}

export function hostOf(url: string | undefined) {
  if (!url) return "";
  try {
    return new URL(/^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`).host;
  } catch {
    return url;
  }
}

/** Safe href for "open" buttons (http/https only). */
export function safeHref(url: string | undefined) {
  if (!url) return null;
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(url) ? url : `https://${url}`);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

/** Short non-secret subtitle for list cards. */
export function subtitleOf(p: VaultPayload): string {
  const f = p.fields;
  const at = (user?: string, host?: string) =>
    user && host ? `${user}@${host}` : (user ?? host ?? "");
  switch (p.type) {
    case "login":
      return [f.username, hostOf(f.url)].filter(Boolean).join(" · ");
    case "server":
    case "ssh_key":
      return at(f.user, f.host);
    case "database":
      return [f.engine, [f.host, f.port].filter(Boolean).join(":"), f.database]
        .filter(Boolean)
        .join(" · ");
    case "api_key":
      return f.service ?? "";
    case "card":
      return f.number ? `•••• ${f.number.replace(/\D/g, "").slice(-4)}` : (f.holder ?? "");
    case "env":
      return p.env.length
        ? p.env
            .map((e) => e.key)
            .slice(0, 3)
            .join(", ")
        : "";
    default:
      return "";
  }
}

/** Main secret for the quick-copy button on cards. */
export function primarySecretOf(p: VaultPayload): string | null {
  const f = p.fields;
  switch (p.type) {
    case "login":
    case "server":
      return f.password ?? null;
    case "database":
      return f.password ?? f.connectionString ?? null;
    case "api_key":
      return f.key ?? f.secret ?? null;
    case "ssh_key":
      return f.privateKey ?? null;
    case "card":
      return f.number ?? null;
    case "note":
      return f.note ?? null;
    case "env":
      return null;
    default:
      return p.custom.find((c) => c.concealed)?.value ?? p.custom[0]?.value ?? null;
  }
}

/** Text used by client-side search (never includes secrets). */
export function searchTextOf(p: VaultPayload) {
  const parts = [p.title];
  for (const f of TYPE_FIELDS[p.type])
    if (f.searchable && p.fields[f.key]) parts.push(p.fields[f.key]!);
  for (const c of p.custom) {
    parts.push(c.label);
    if (!c.concealed) parts.push(c.value);
  }
  for (const e of p.env) parts.push(e.key);
  return parts.join(" ").toLowerCase();
}
