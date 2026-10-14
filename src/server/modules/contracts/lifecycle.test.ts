import { describe, expect, it } from "vitest";
import type { ContractStatus } from "@/server/db/schema/contracts";
import { contentHash, isValidSignatureImage, verifyContent } from "./integrity";
import {
  allowedActions,
  can,
  checkSignable,
  contentChanged,
  effectiveStatus,
  normalizeBody,
  planEdit,
  shortHash,
  type EditableContract,
} from "./lifecycle";

const NOW = Date.UTC(2026, 9, 14, 12);
const past = new Date(NOW - 1000);
const future = new Date(NOW + 86_400_000);

function doc(over: Partial<EditableContract> = {}): EditableContract {
  return {
    status: "sent",
    expiresAt: null,
    isTemplate: false,
    version: 1,
    contentHash: contentHash("# Body"),
    title: "Agreement",
    bodyMd: "# Body",
    requireSignature: true,
    ...over,
  };
}

describe("effectiveStatus", () => {
  it("derives expired for pending documents past their deadline", () => {
    expect(effectiveStatus({ status: "sent", expiresAt: past }, NOW)).toBe("expired");
    expect(effectiveStatus({ status: "viewed", expiresAt: past }, NOW)).toBe("expired");
    expect(effectiveStatus({ status: "viewed", expiresAt: future }, NOW)).toBe("viewed");
    expect(effectiveStatus({ status: "sent", expiresAt: null }, NOW)).toBe("sent");
  });

  it("never changes terminal statuses", () => {
    for (const s of ["draft", "signed", "declined", "void"] as ContractStatus[]) {
      expect(effectiveStatus({ status: s, expiresAt: past }, NOW)).toBe(s);
    }
  });
});

describe("state machine", () => {
  const subject = (status: ContractStatus, expiresAt: Date | null = null, isTemplate = false) => ({
    status,
    expiresAt,
    isTemplate,
  });

  it("drafts can be edited, sent and deleted but not signed", () => {
    const d = subject("draft");
    expect(can(d, "edit", NOW)).toBe(true);
    expect(can(d, "send", NOW)).toBe(true);
    expect(can(d, "delete", NOW)).toBe(true);
    expect(can(d, "sign", NOW)).toBe(false);
    expect(can(d, "void", NOW)).toBe(false);
  });

  it("pending documents can be signed, declined, reminded, voided and re-issued", () => {
    for (const s of ["sent", "viewed"] as const) {
      const d = subject(s);
      for (const a of ["sign", "decline", "remind", "void", "edit", "view", "countersign"] as const)
        expect(can(d, a, NOW)).toBe(true);
      expect(can(d, "delete", NOW)).toBe(false);
    }
  });

  it("signed documents are immutable", () => {
    const d = subject("signed");
    expect(allowedActions(d, NOW).sort()).toEqual(["countersign", "duplicate"]);
    expect(can(d, "edit", NOW)).toBe(false);
    expect(can(d, "void", NOW)).toBe(false);
    expect(can(d, "delete", NOW)).toBe(false);
  });

  it("expired (derived) documents can't be signed but can be edited or voided", () => {
    const d = subject("sent", past);
    expect(can(d, "sign", NOW)).toBe(false);
    expect(can(d, "remind", NOW)).toBe(false);
    expect(can(d, "edit", NOW)).toBe(true);
    expect(can(d, "void", NOW)).toBe(true);
  });

  it("void is terminal (duplicate only)", () => {
    expect(allowedActions(subject("void"), NOW)).toEqual(["duplicate"]);
  });

  it("templates are never sendable or signable", () => {
    const t = subject("draft", null, true);
    expect(can(t, "send", NOW)).toBe(false);
    expect(can(t, "sign", NOW)).toBe(false);
    expect(can(t, "edit", NOW)).toBe(true);
    expect(can(t, "delete", NOW)).toBe(true);
  });
});

describe("planEdit (hash/version rules)", () => {
  const patch = (c: EditableContract, over: Partial<EditableContract> = {}) => ({
    title: over.title ?? c.title,
    bodyMd: over.bodyMd ?? c.bodyMd,
    requireSignature: over.requireSignature ?? c.requireSignature,
    expiresAt: over.expiresAt !== undefined ? over.expiresAt : c.expiresAt,
  });

  it("drafts and templates edit freely without versioning", () => {
    const d = doc({ status: "draft", contentHash: null });
    expect(planEdit(d, patch(d, { bodyMd: "new" }), NOW, contentHash)).toEqual({ kind: "draft" });
    const t = doc({ isTemplate: true, status: "draft" });
    expect(planEdit(t, patch(t, { bodyMd: "x" }), NOW, contentHash).kind).toBe("draft");
  });

  it("content edits on a sent/viewed document bump the version and re-hash", () => {
    for (const status of ["sent", "viewed", "declined", "expired"] as const) {
      const d = doc({ status, version: 3 });
      const plan = planEdit(d, patch(d, { bodyMd: "# Body v2" }), NOW, contentHash);
      expect(plan).toEqual({
        kind: "reissue",
        version: 4,
        contentHash: contentHash("# Body v2"),
        status: "sent",
        fromVersion: 3,
      });
    }
  });

  it("title and signature-mode changes are content changes too", () => {
    const d = doc();
    expect(planEdit(d, patch(d, { title: "New title" }), NOW, contentHash).kind).toBe("reissue");
    expect(planEdit(d, patch(d, { requireSignature: false }), NOW, contentHash).kind).toBe(
      "reissue",
    );
  });

  it("metadata-only edits keep the version", () => {
    const d = doc({ status: "viewed" });
    expect(planEdit(d, patch(d, { expiresAt: future }), NOW, contentHash)).toEqual({
      kind: "metadata",
      status: "viewed",
    });
  });

  it("extending a stored 'expired' status re-opens it", () => {
    const d = doc({ status: "expired", expiresAt: past });
    expect(planEdit(d, patch(d, { expiresAt: future }), NOW, contentHash)).toEqual({
      kind: "metadata",
      status: "sent",
    });
  });

  it("ignores CRLF/trailing-whitespace noise from <textarea>", () => {
    const d = doc({ bodyMd: "line 1\nline 2\n" });
    expect(contentChanged(d, { ...d, bodyMd: "line 1\r\nline 2  \r\n" })).toBe(false);
    expect(planEdit(d, patch(d, { bodyMd: "line 1\r\nline 2" }), NOW, contentHash).kind).toBe(
      "metadata",
    );
  });

  it("signed and void documents are locked", () => {
    expect(
      planEdit(doc({ status: "signed" }), patch(doc(), { bodyMd: "x" }), NOW, contentHash),
    ).toEqual({ kind: "locked", reason: "signed" });
    expect(planEdit(doc({ status: "void" }), patch(doc()), NOW, contentHash)).toEqual({
      kind: "locked",
      reason: "void",
    });
  });
});

describe("checkSignable", () => {
  const pinned = { contentHash: contentHash("# Body"), version: 1 };

  it("accepts the exact pinned text of a pending document", () => {
    expect(checkSignable(doc(), pinned, NOW)).toEqual({ ok: true });
    expect(checkSignable(doc({ status: "viewed", expiresAt: future }), pinned, NOW)).toEqual({
      ok: true,
    });
  });

  it("rejects a stale page (hash or version changed)", () => {
    expect(checkSignable(doc(), { ...pinned, version: 2 }, NOW)).toEqual({
      ok: false,
      reason: "changed",
    });
    expect(checkSignable(doc(), { ...pinned, contentHash: contentHash("other") }, NOW)).toEqual({
      ok: false,
      reason: "changed",
    });
    expect(checkSignable(doc({ contentHash: null }), pinned, NOW)).toEqual({
      ok: false,
      reason: "changed",
    });
  });

  it("rejects expired, signed and closed documents", () => {
    expect(checkSignable(doc({ expiresAt: past }), pinned, NOW)).toEqual({
      ok: false,
      reason: "expired",
    });
    expect(checkSignable(doc({ status: "signed" }), pinned, NOW)).toEqual({
      ok: false,
      reason: "signed",
    });
    for (const status of ["void", "declined", "draft"] as const)
      expect(checkSignable(doc({ status }), pinned, NOW)).toEqual({ ok: false, reason: "closed" });
  });
});

describe("integrity helpers", () => {
  it("hashes with sha256 hex and verifies", () => {
    expect(contentHash("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(verifyContent({ bodyMd: "a", contentHash: contentHash("a") })).toBe(true);
    expect(verifyContent({ bodyMd: "a!", contentHash: contentHash("a") })).toBe(false);
    expect(verifyContent({ bodyMd: "a", contentHash: null })).toBe(false);
  });

  it("formats short hashes", () => {
    expect(shortHash("0123456789abcdef")).toBe("0123·4567·89ab");
    expect(shortHash(null)).toBe("—");
  });

  it("normalizes bodies", () => {
    expect(normalizeBody("a\r\nb\r\n\r\n")).toBe("a\nb");
  });

  it("accepts only real, bounded PNG data URLs as signatures", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
    expect(isValidSignatureImage(`data:image/png;base64,${png.toString("base64")}`)).toBe(true);
    expect(isValidSignatureImage("data:image/svg+xml;base64,PHN2Zz4=")).toBe(false);
    expect(
      isValidSignatureImage(`data:image/png;base64,${Buffer.from("GIF89a").toString("base64")}`),
    ).toBe(false);
    expect(isValidSignatureImage(`data:image/png;base64,${"A".repeat(300_000)}`)).toBe(false);
    expect(isValidSignatureImage("data:image/png;base64,<script>")).toBe(false);
  });
});
