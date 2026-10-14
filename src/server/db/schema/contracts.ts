import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { bool, createdAt, json, pk, timestamp, updatedAt } from "./_columns";
import { users } from "./auth";
import { clients } from "./crm";
import { projects } from "./projects";

export const contractKinds = ["contract", "proposal", "nda", "approval", "change_request"] as const;
export const contractStatuses = [
  "draft",
  "sent",
  "viewed",
  "signed",
  "declined",
  "void",
  "expired",
] as const;
export type ContractStatus = (typeof contractStatuses)[number];

/**
 * Contracts, proposals and approvals sent to clients via a private link
 * (/sign/<shareToken>). The exact signed text is pinned via `contentHash`
 * (SHA-256 of bodyMd) so later edits cannot alter what was signed.
 */
export const contracts = sqliteTable(
  "contracts",
  {
    id: pk(),
    title: text("title").notNull(),
    kind: text("kind", { enum: contractKinds }).notNull().default("contract"),
    clientId: text("client_id").references(() => clients.id, { onDelete: "set null" }),
    projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
    bodyMd: text("body_md").notNull().default(""),
    status: text("status", { enum: contractStatuses }).notNull().default("draft"),
    /** false = acknowledgement only ("I have read and approve"). */
    requireSignature: bool("require_signature").notNull().default(true),
    /** Reusable template (not sent). Supports {{placeholders}} filled when creating from it. */
    isTemplate: bool("is_template").notNull().default(false),
    shareToken: text("share_token"),
    contentHash: text("content_hash"),
    version: integer("version").notNull().default(1),
    signerName: text("signer_name"),
    signerEmail: text("signer_email"),
    sentAt: timestamp("sent_at"),
    firstViewedAt: timestamp("first_viewed_at"),
    signedAt: timestamp("signed_at"),
    declinedAt: timestamp("declined_at"),
    declineReason: text("decline_reason"),
    expiresAt: timestamp("expires_at"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("contracts_share_token_uq").on(t.shareToken),
    index("contracts_client_idx").on(t.clientId),
  ],
);

export const contractSignatures = sqliteTable(
  "contract_signatures",
  {
    id: pk(),
    contractId: text("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["client", "owner"] })
      .notNull()
      .default("client"),
    name: text("name").notNull(),
    email: text("email"),
    /** PNG data URL of the drawn signature (optional when typed). */
    signatureImage: text("signature_image"),
    typedName: text("typed_name"),
    contentHash: text("content_hash").notNull(),
    version: integer("version").notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    signedAt: createdAt(),
  },
  (t) => [index("contract_signatures_contract_idx").on(t.contractId)],
);

export const contractEventTypes = [
  "created",
  "updated",
  "sent",
  "viewed",
  "signed",
  "declined",
  "voided",
  "reminded",
] as const;

/** Immutable audit trail for each contract. */
export const contractEvents = sqliteTable(
  "contract_events",
  {
    id: pk(),
    contractId: text("contract_id")
      .notNull()
      .references(() => contracts.id, { onDelete: "cascade" }),
    type: text("type", { enum: contractEventTypes }).notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    meta: json<Record<string, unknown>>("meta"),
    at: createdAt(),
  },
  (t) => [index("contract_events_contract_idx").on(t.contractId, t.at)],
);
