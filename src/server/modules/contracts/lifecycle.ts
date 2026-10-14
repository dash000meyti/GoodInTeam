/**
 * Contract lifecycle — pure rules (no DB, no I/O) so they are unit-tested and
 * shared by the service, the panel and the public signing page.
 *
 *   draft ──send──► sent ──view──► viewed ──sign──► signed (immutable)
 *                    │  ▲            │
 *                    │  └──edit──────┤   (content edit ⇒ version+1, back to "sent")
 *                    ├──decline──────┴──► declined ──edit──► sent (re-issued)
 *                    ├──void─────────────► void
 *                    └──(expiresAt passes)► expired ──edit (new expiry/content)──► sent
 *
 * "expired" is derived: a sent/viewed contract whose `expiresAt` is in the past
 * is treated as expired everywhere (`effectiveStatus`) without a write.
 */
import type { ContractStatus } from "@/server/db/schema/contracts";

export type ContractAction =
  | "edit"
  | "send"
  | "remind"
  | "void"
  | "delete"
  | "duplicate"
  | "countersign"
  | "view"
  | "sign"
  | "decline";

export interface LifecycleSubject {
  status: ContractStatus;
  expiresAt: Date | null;
  isTemplate: boolean;
}

/** Statuses the public signer can act on. */
export const PENDING_STATUSES = ["sent", "viewed"] as const satisfies readonly ContractStatus[];
/** Statuses grouped under the "closed" tab. */
export const CLOSED_STATUSES = [
  "declined",
  "void",
  "expired",
] as const satisfies readonly ContractStatus[];

export function isPendingStatus(s: ContractStatus): s is (typeof PENDING_STATUSES)[number] {
  return s === "sent" || s === "viewed";
}

/** Status as the user should see it: sent/viewed past `expiresAt` → "expired". */
export function effectiveStatus(
  c: { status: ContractStatus; expiresAt: Date | null },
  now: number,
): ContractStatus {
  if (isPendingStatus(c.status) && c.expiresAt && c.expiresAt.getTime() <= now) return "expired";
  return c.status;
}

const ALLOWED: Record<ContractStatus, readonly ContractAction[]> = {
  draft: ["edit", "send", "delete", "duplicate"],
  sent: ["edit", "send", "remind", "void", "duplicate", "countersign", "view", "sign", "decline"],
  viewed: ["edit", "send", "remind", "void", "duplicate", "countersign", "view", "sign", "decline"],
  signed: ["duplicate", "countersign"],
  declined: ["edit", "void", "duplicate"],
  expired: ["edit", "void", "duplicate"],
  void: ["duplicate"],
};

const TEMPLATE_ALLOWED: readonly ContractAction[] = ["edit", "delete", "duplicate"];

/** Whether `action` is allowed for the contract right now. */
export function can(c: LifecycleSubject, action: ContractAction, now: number) {
  if (c.isTemplate) return TEMPLATE_ALLOWED.includes(action);
  return ALLOWED[effectiveStatus(c, now)].includes(action);
}

/** All actions currently allowed (handy for building UIs). */
export function allowedActions(c: LifecycleSubject, now: number): ContractAction[] {
  if (c.isTemplate) return [...TEMPLATE_ALLOWED];
  return [...ALLOWED[effectiveStatus(c, now)]];
}

// ─── Editing & versioning ──────────────────────────────────────────────────

export interface EditableContract extends LifecycleSubject {
  version: number;
  contentHash: string | null;
  title: string;
  bodyMd: string;
  requireSignature: boolean;
}

export interface EditPatch {
  title: string;
  bodyMd: string;
  requireSignature: boolean;
  expiresAt: Date | null;
}

export type EditPlan =
  /** Free edit: drafts and templates (no version, no hash yet). */
  | { kind: "draft" }
  /** Content changed after sending: new version + hash, signer must review again. */
  | {
      kind: "reissue";
      version: number;
      contentHash: string;
      status: "sent";
      fromVersion: number;
    }
  /** Only metadata changed (expiry, signer, links): version kept. */
  | { kind: "metadata"; status: ContractStatus }
  /** Signed / void documents are immutable. */
  | { kind: "locked"; reason: "signed" | "void" };

/** Did anything the signer sees/agrees to change? */
export function contentChanged(
  a: Pick<EditableContract, "title" | "bodyMd" | "requireSignature">,
  b: Pick<EditPatch, "title" | "bodyMd" | "requireSignature">,
) {
  return (
    a.title.trim() !== b.title.trim() ||
    normalizeBody(a.bodyMd) !== normalizeBody(b.bodyMd) ||
    a.requireSignature !== b.requireSignature
  );
}

/**
 * Decide what an edit does to version / hash / status.
 * Rules:
 * - drafts & templates: edited freely, no versioning.
 * - signed & void: immutable (duplicate as a new version instead).
 * - sent / viewed / declined / expired + content change → version+1, new hash,
 *   status "sent" (the signer must open and sign again).
 * - metadata-only change keeps the version; a stored "expired" status whose
 *   expiry moves to the future goes back to "sent".
 */
export function planEdit(
  current: EditableContract,
  patch: EditPatch,
  now: number,
  hash: (body: string) => string,
): EditPlan {
  if (current.isTemplate || current.status === "draft") return { kind: "draft" };
  if (current.status === "signed" || current.status === "void") {
    return { kind: "locked", reason: current.status };
  }
  if (contentChanged(current, patch)) {
    return {
      kind: "reissue",
      version: current.version + 1,
      contentHash: hash(patch.bodyMd),
      status: "sent",
      fromVersion: current.version,
    };
  }
  const notExpiredAnymore = !patch.expiresAt || patch.expiresAt.getTime() > now;
  if (current.status === "expired" && notExpiredAnymore)
    return { kind: "metadata", status: "sent" };
  return { kind: "metadata", status: current.status };
}

// ─── Signing ───────────────────────────────────────────────────────────────

export type SignCheck =
  { ok: true } | { ok: false; reason: "closed" | "expired" | "changed" | "signed" };

/**
 * Can the public signer sign/decline *this exact text*? The page posts back
 * the `contentHash` + `version` it rendered; any mismatch means the document
 * changed after it was loaded and the signer must reload and re-read it.
 */
export function checkSignable(
  c: {
    status: ContractStatus;
    expiresAt: Date | null;
    contentHash: string | null;
    version: number;
  },
  posted: { contentHash: string; version: number },
  now: number,
): SignCheck {
  const s = effectiveStatus(c, now);
  if (s === "signed") return { ok: false, reason: "signed" };
  if (s === "expired") return { ok: false, reason: "expired" };
  if (!isPendingStatus(s)) return { ok: false, reason: "closed" };
  if (!c.contentHash || c.contentHash !== posted.contentHash || c.version !== posted.version) {
    return { ok: false, reason: "changed" };
  }
  return { ok: true };
}

/** First 12 hex chars of a content hash, grouped for humans: "3f2a·9c41·0b7e". */
export function shortHash(hash: string | null | undefined) {
  if (!hash) return "—";
  return hash.slice(0, 12).replace(/(.{4})(?=.)/g, "$1·");
}

/** Normalize a markdown body before storing (CRLF from <textarea> → LF, no trailing blanks). */
export function normalizeBody(body: string) {
  return body.replace(/\r\n?/g, "\n").trimEnd();
}
