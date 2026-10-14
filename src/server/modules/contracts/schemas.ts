import { z } from "zod";
import { contractKinds, contractStatuses } from "@/server/db/schema/contracts";
import { zBool, zId, zNullString, zOptString } from "@/lib/zod-helpers";

/** Optional boolean that stays `undefined` when missing (zBool turns missing into false). */
const zOptBool = z.preprocess(
  (v) =>
    v === undefined || v === null || v === ""
      ? undefined
      : v === true || v === "on" || v === "true" || v === "1",
  z.boolean().optional(),
);

/** "YYYY-MM-DD" (app timezone), "" → null (clears). */
const zDay = z.preprocess(
  (v) => (v === "" ? null : v),
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .nullable()
    .optional(),
);

const zEmail = z.preprocess(
  (v) => (typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : v),
  z.email().max(200).nullable().optional(),
);

const zBody = z.string().max(200_000);

/** Extra placeholder values, e.g. { "milestone.title": "Phase 2" }. JSON only. */
const zValues = z.record(z.string().max(100), z.string().max(5000)).optional();

export const contractListStatuses = [...contractStatuses, "awaiting", "closed"] as const;
export type ContractListStatus = (typeof contractListStatuses)[number];

export const contractInput = z.object({
  title: z.string().trim().max(300).optional(),
  kind: z.enum(contractKinds).optional(),
  clientId: zNullString(64),
  projectId: zNullString(64),
  /** Markdown. `{{placeholders}}` are filled from client/project/settings on save. */
  bodyMd: zBody.optional(),
  /** true = drawn/typed signature; false = simple "I approve" acknowledgement. */
  requireSignature: zOptBool,
  /** Last day the link can be signed ("YYYY-MM-DD", app timezone). */
  expiresAt: zDay,
  signerName: zNullString(200),
  signerEmail: zEmail,
  /** Save as a reusable template (never sent, placeholders kept). */
  isTemplate: zOptBool,
  /** Start from a saved template (id) … */
  templateId: zOptString(64),
  /** … or from a built-in starter (key, see contracts_list_templates). */
  starter: zOptString(64),
  values: zValues,
  /** Language used to format placeholder dates/money; default: detected from the text. */
  locale: z.enum(["fa", "en"]).optional(),
});
export type ContractInput = z.input<typeof contractInput>;

export const updateContractInput = contractInput
  .omit({ isTemplate: true, templateId: true, starter: true })
  .extend({ id: zId });

export const listContractsInput = z.object({
  /** A stored status, or "awaiting" (sent+viewed, not expired) / "closed" (declined+void+expired). */
  status: z.enum(contractListStatuses).optional(),
  clientId: zOptString(64),
  projectId: zOptString(64),
  q: zOptString(200),
  /** List templates instead of documents. */
  templates: zOptBool,
  limit: z.coerce.number().int().min(1).max(500).optional(),
});

export const idInput = z.object({ id: zId });

export const sendContractInput = z.object({
  id: zId,
  /** Optional new expiry "YYYY-MM-DD" applied when sending a draft. */
  expiresAt: zDay,
});

export const voidContractInput = z.object({
  id: zId,
  reason: zNullString(1000),
});

export const duplicateContractInput = z.object({
  id: zId,
  /** Keep the same title (used for "duplicate signed contract as a new version"). */
  asNewVersion: zOptBool,
});

export const saveAsTemplateInput = z.union([
  z.object({ id: zId, title: z.string().trim().min(1).max(300).optional() }),
  z.object({
    title: z.string().trim().min(1).max(300),
    kind: z.enum(contractKinds).default("contract"),
    requireSignature: zOptBool,
    bodyMd: zBody,
  }),
]);

export const applyTemplateInput = z.object({
  templateId: zOptString(64),
  starter: zOptString(64),
  clientId: zOptString(64),
  projectId: zOptString(64),
  values: zValues,
});

export const installStartersInput = z.object({
  keys: z.array(z.string().max(64)).max(20).optional(),
});

const zSignatureImage = z.preprocess(
  (v) => (v === "" ? undefined : v),
  z.string().max(220_000).optional(),
);

export const countersignInput = z.object({
  id: zId,
  name: z.string().trim().min(2).max(200),
  typedName: zOptString(200),
  signatureImage: zSignatureImage,
  consent: zBool.refine((v) => v),
});

// ─── Public (signing page) ─────────────────────────────────────────────────

const zToken = z.string().min(16).max(64);
const zPinned = {
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
  version: z.coerce.number().int().min(1),
};

export const viewContractInput = z.object({ token: zToken });

export const signContractInput = z.object({
  token: zToken,
  name: z.string().trim().min(2).max(200),
  email: zEmail,
  typedName: zOptString(200),
  signatureImage: zSignatureImage,
  consent: zBool.refine((v) => v),
  ...zPinned,
});

export const declineContractInput = z.object({
  token: zToken,
  name: zOptString(200),
  reason: zOptString(2000),
  ...zPinned,
});
