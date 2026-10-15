/**
 * Pure text formats used by the vault UI: .env files, CSV export and the
 * encrypted backup file. No secrets leave the browser through these helpers —
 * they only build/parse strings the user explicitly downloads or pastes.
 */
import type { EnvPair } from "./item-types";

// ─── .env ───────────────────────────────────────────────────────────────────

const ENV_KEY = /^[A-Za-z_][A-Za-z0-9_.-]*$/;

/** Parse dotenv text: comments, blank lines, `export`, single/double quotes. */
export function parseEnv(text: string): EnvPair[] {
  const out: EnvPair[] = [];
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line || line.startsWith("#")) continue;
    const m = /^(?:export\s+)?([^=\s]+)\s*=\s*(.*)$/.exec(line);
    if (!m || !ENV_KEY.test(m[1]!)) continue;
    const key = m[1]!;
    let rest = m[2]!;
    let value: string;
    if (rest.startsWith('"')) {
      // Double-quoted: may span lines; supports \n \t \" \\ escapes.
      let raw = rest.slice(1);
      while (findClosingQuote(raw) < 0 && i + 1 < lines.length) raw += `\n${lines[++i]}`;
      const end = findClosingQuote(raw);
      value = (end >= 0 ? raw.slice(0, end) : raw).replace(/\\([nrt"\\])/g, (_, c: string) =>
        c === "n" ? "\n" : c === "r" ? "\r" : c === "t" ? "\t" : c,
      );
    } else if (rest.startsWith("'")) {
      const end = rest.indexOf("'", 1);
      value = end > 0 ? rest.slice(1, end) : rest.slice(1);
    } else {
      const hash = rest.search(/\s#/);
      if (hash >= 0) rest = rest.slice(0, hash);
      value = rest.trim();
    }
    const existing = out.findIndex((p) => p.key === key);
    if (existing >= 0) out[existing] = { key, value };
    else out.push({ key, value });
  }
  return out;
}

function findClosingQuote(s: string) {
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\") i++;
    else if (s[i] === '"') return i;
  }
  return -1;
}

/** Serialise pairs as dotenv; quotes values only when needed. */
export function serializeEnv(pairs: EnvPair[]): string {
  return pairs
    .filter((p) => p.key.trim())
    .map(({ key, value }) => {
      const plain = /^[A-Za-z0-9_./:@%+,=?&~!*-]*$/.test(value);
      const v = plain
        ? value
        : `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r")}"`;
      return `${key.trim()}=${v}`;
    })
    .join("\n");
}

// ─── CSV ────────────────────────────────────────────────────────────────────

function csvCell(v: string) {
  return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** RFC 4180 CSV with a header row. */
export function toCsv(header: string[], rows: string[][]): string {
  return [header, ...rows].map((r) => r.map((c) => csvCell(c ?? "")).join(",")).join("\r\n");
}

// ─── Encrypted backup file ──────────────────────────────────────────────────

export const BACKUP_FORMAT = "good-team-vault-backup";

export interface BackupKeys {
  kdf: string;
  iterations: number;
  salt: string;
  wrappedKey: string;
  wrapIv: string;
  recoverySalt: string | null;
  recoveryWrappedKey: string | null;
  recoveryIv: string | null;
}

export interface BackupItem {
  id: string;
  type: string;
  projectId: string | null;
  clientId: string | null;
  favorite: boolean;
  ciphertext: string;
  iv: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface VaultBackup {
  format: typeof BACKUP_FORMAT;
  version: 1;
  exportedAt: string;
  keys: BackupKeys;
  items: BackupItem[];
}

const isStr = (v: unknown): v is string => typeof v === "string";
const isNullableStr = (v: unknown): v is string | null => v === null || typeof v === "string";

/** Validate a parsed backup file. Returns null when it isn't one of ours. */
export function parseBackup(raw: unknown): VaultBackup | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.format !== BACKUP_FORMAT || o.version !== 1) return null;
  const k = o.keys as Record<string, unknown> | undefined;
  if (
    !k ||
    !isStr(k.kdf) ||
    typeof k.iterations !== "number" ||
    !isStr(k.salt) ||
    !isStr(k.wrappedKey) ||
    !isStr(k.wrapIv) ||
    !isNullableStr(k.recoverySalt ?? null) ||
    !isNullableStr(k.recoveryWrappedKey ?? null) ||
    !isNullableStr(k.recoveryIv ?? null)
  ) {
    return null;
  }
  if (!Array.isArray(o.items)) return null;
  const items: BackupItem[] = [];
  for (const it of o.items as unknown[]) {
    if (!it || typeof it !== "object") return null;
    const i = it as Record<string, unknown>;
    if (!isStr(i.id) || !isStr(i.type) || !isStr(i.ciphertext) || !isStr(i.iv)) return null;
    items.push({
      id: i.id,
      type: i.type,
      projectId: isStr(i.projectId) ? i.projectId : null,
      clientId: isStr(i.clientId) ? i.clientId : null,
      favorite: i.favorite === true,
      ciphertext: i.ciphertext,
      iv: i.iv,
      createdAt: isStr(i.createdAt) ? i.createdAt : undefined,
      updatedAt: isStr(i.updatedAt) ? i.updatedAt : undefined,
    });
  }
  return {
    format: BACKUP_FORMAT,
    version: 1,
    exportedAt: isStr(o.exportedAt) ? o.exportedAt : "",
    keys: {
      kdf: k.kdf,
      iterations: k.iterations,
      salt: k.salt,
      wrappedKey: k.wrappedKey,
      wrapIv: k.wrapIv,
      recoverySalt: (k.recoverySalt as string | null) ?? null,
      recoveryWrappedKey: (k.recoveryWrappedKey as string | null) ?? null,
      recoveryIv: (k.recoveryIv as string | null) ?? null,
    },
    items,
  };
}

/** Trigger a browser download of a text file. */
export function downloadText(filename: string, text: string, type = "text/plain") {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
