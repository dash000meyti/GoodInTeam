import "server-only";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  isNotNull,
  isNull,
  like,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { z } from "zod";
import { db } from "@/server/db/client";
import {
  clients,
  contractEvents,
  contracts,
  contractSignatures,
  projects,
  users,
  type ContractStatus,
} from "@/server/db/schema";
import { assertAdmin, isAdmin, type Actor } from "@/server/auth/actor";
import { logActivity } from "@/server/activity";
import { AppError, forbidden, notFound } from "@/server/errors";
import { notify } from "@/server/modules/notifications/service";
import { appTimezone, getSettings } from "@/server/modules/settings/service";
import { localeMeta, localePath, type Locale } from "@/i18n/config";
import { format } from "@/i18n/format-message";
import { messages, type Messages } from "@/i18n/messages";
import { env } from "@/lib/env";
import { newToken } from "@/lib/ids";
import { formatNumber } from "@/lib/format";
import { markdownToText } from "@/lib/markdown";
import { formatMoney } from "@/lib/money";
import { fromDateInput, startOfMonth } from "@/lib/tz";
import { contentHash, isValidSignatureImage, verifyContent } from "./integrity";
import {
  allowedActions,
  can,
  effectiveStatus,
  isPendingStatus,
  normalizeBody,
  planEdit,
  checkSignable,
  type ContractAction,
} from "./lifecycle";
import {
  detectDocLocale,
  extractPlaceholders,
  fillPlaceholders,
  type PlaceholderValues,
} from "./placeholders";
import { findStarter, STARTER_TEMPLATES } from "./starters";
import type {
  applyTemplateInput,
  contractInput,
  countersignInput,
  declineContractInput,
  duplicateContractInput,
  listContractsInput,
  saveAsTemplateInput,
  sendContractInput,
  signContractInput,
  updateContractInput,
  voidContractInput,
} from "./schemas";

// ─── Errors ─────────────────────────────────────────────────────────────────

export type ContractRule =
  | "locked_signed"
  | "locked_void"
  | "not_allowed"
  | "expiry_past"
  | "empty_body"
  | "empty_title"
  | "already_countersigned"
  | "signature_required"
  | "invalid_signature"
  | "template_not_sendable";

/**
 * A business-rule violation. `message` is English (API/MCP); panel actions map
 * `rule` to a localized message (`t.contracts.rule_<rule>`).
 */
export class ContractRuleError extends AppError {
  constructor(
    public rule: ContractRule,
    message: string,
    public field?: string,
  ) {
    super("conflict", message);
    this.name = "ContractRuleError";
  }
}

// ─── Access ─────────────────────────────────────────────────────────────────

/**
 * Contracts hold commercial terms → owner/admin manage them; clients see their
 * own client's sent documents (never drafts/templates); members have no access.
 */
function scopeWhere(actor: Actor): SQL | undefined {
  if (isAdmin(actor)) return undefined;
  if (actor.user.role === "client" && actor.user.clientId) {
    return and(
      eq(contracts.clientId, actor.user.clientId),
      eq(contracts.isTemplate, false),
      ne(contracts.status, "draft"),
      isNotNull(contracts.shareToken),
    );
  }
  return sql`0`;
}

export function canAccessContracts(actor: Actor) {
  return isAdmin(actor) || (actor.user.role === "client" && !!actor.user.clientId);
}

function assertReader(actor: Actor) {
  if (!canAccessContracts(actor)) throw forbidden();
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function load(id: string) {
  const row = db.select().from(contracts).where(eq(contracts.id, id)).get();
  if (!row) throw notFound("Contract");
  return row;
}

type Row = typeof contracts.$inferSelect;

function assertCan(c: Row, action: ContractAction, now = Date.now()) {
  if (can(c, action, now)) return;
  if (c.status === "signed")
    throw new ContractRuleError(
      "locked_signed",
      "Signed documents are immutable. Duplicate it as a new version instead.",
    );
  if (c.status === "void") throw new ContractRuleError("locked_void", "This document was voided.");
  throw new ContractRuleError(
    "not_allowed",
    `Action "${action}" is not allowed while the document is ${effectiveStatus(c, now)}.`,
  );
}

/** Expiry day "YYYY-MM-DD" → end of that day in the app timezone. */
function expiryFromDay(day: string | null | undefined) {
  if (day === undefined) return undefined;
  if (day === null) return null;
  return fromDateInput(day, "23:59", appTimezone());
}

function event(
  contractId: string,
  type: (typeof contractEvents.$inferInsert)["type"],
  meta?: Record<string, unknown> | null,
  req?: { ip: string | null; userAgent: string | null },
) {
  db.insert(contractEvents)
    .values({
      contractId,
      type,
      meta: meta ?? null,
      ip: req?.ip ?? null,
      userAgent: req?.userAgent?.slice(0, 500) ?? null,
    })
    .run();
}

/** Signing link path in the document's language: /sign/<token> or /en/sign/<token>. */
export function signPath(c: { shareToken: string | null; bodyMd: string }) {
  if (!c.shareToken) return null;
  return localePath(detectDocLocale(c.bodyMd), `/sign/${c.shareToken}`);
}

function signUrl(c: { shareToken: string | null; bodyMd: string }) {
  const p = signPath(c);
  return p ? `${env.siteUrl}${p}` : null;
}

/** "22 Mehr 1405" / "October 14, 2026" in the app timezone. */
export function longDate(d: Date | number, locale: Locale) {
  const meta = localeMeta[locale];
  return new Intl.DateTimeFormat(`${meta.intl}-u-ca-${meta.calendar}`, {
    timeZone: appTimezone(),
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(d));
}

export function brandAndOwner(locale: Locale) {
  const profile = getSettings("profile");
  const owner = db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.role, "owner"))
    .orderBy(asc(users.createdAt))
    .get();
  return {
    brandName: profile.brandName[locale] || profile.brandName.fa || profile.brandName.en,
    ownerName:
      profile.ownerName[locale] ||
      profile.ownerName.fa ||
      profile.ownerName.en ||
      owner?.name ||
      "",
  };
}

/** Values for the built-in placeholders (see placeholders.ts). */
export function placeholderValues(opts: {
  clientId?: string | null;
  projectId?: string | null;
  locale: Locale;
  now?: number;
  extra?: PlaceholderValues;
}): PlaceholderValues {
  const project = opts.projectId
    ? db.select().from(projects).where(eq(projects.id, opts.projectId)).get()
    : undefined;
  const clientId = opts.clientId ?? project?.clientId ?? null;
  const client = clientId
    ? db.select().from(clients).where(eq(clients.id, clientId)).get()
    : undefined;
  const { brandName, ownerName } = brandAndOwner(opts.locale);
  return {
    "client.name": client?.name,
    "client.email": client?.email,
    "client.phone": client?.phone,
    "client.address": client?.address,
    "project.name": project?.name,
    "project.budget":
      project?.budgetMinor != null
        ? formatMoney(project.budgetMinor, project.currency, opts.locale)
        : null,
    "project.startDate": project?.startDate ? longDate(project.startDate, opts.locale) : null,
    "project.dueDate": project?.dueDate ? longDate(project.dueDate, opts.locale) : null,
    "owner.name": ownerName,
    "brand.name": brandName,
    today: longDate(opts.now ?? Date.now(), opts.locale),
    ...opts.extra,
  };
}

function assertRefs(clientId: string | null | undefined, projectId: string | null | undefined) {
  const fieldErrors: Record<string, string[]> = {};
  if (
    clientId &&
    !db.select({ id: clients.id }).from(clients).where(eq(clients.id, clientId)).get()
  )
    fieldErrors.clientId = ["Client not found"];
  if (
    projectId &&
    !db.select({ id: projects.id }).from(projects).where(eq(projects.id, projectId)).get()
  )
    fieldErrors.projectId = ["Project not found"];
  if (Object.keys(fieldErrors).length)
    throw new AppError("validation", "Invalid links", fieldErrors);
}

function projectClientId(projectId: string | null | undefined) {
  if (!projectId) return null;
  return (
    db
      .select({ clientId: projects.clientId })
      .from(projects)
      .where(eq(projects.id, projectId))
      .get()?.clientId ?? null
  );
}

/**
 * In-app notification for every active owner/admin, in their own language
 * (same audience as notifyAdmins()).
 */
function notifyAdminsLocalized(
  kind: string,
  href: string,
  build: (t: Messages["contracts"], locale: Locale) => { title: string; body?: string },
) {
  const admins = db
    .select({ id: users.id, locale: users.locale })
    .from(users)
    .where(and(inArray(users.role, ["owner", "admin"]), eq(users.disabled, false)))
    .all();
  for (const a of admins)
    notify(a.id, { kind, href, ...build(messages[a.locale].contracts, a.locale) });
}

// ─── Status filters ─────────────────────────────────────────────────────────

function statusWhere(
  status: z.output<typeof listContractsInput>["status"],
  now: number,
): SQL | undefined {
  const at = new Date(now);
  const pending = inArray(contracts.status, ["sent", "viewed"]);
  const live = or(isNull(contracts.expiresAt), gt(contracts.expiresAt, at));
  const lapsed = and(pending, lte(contracts.expiresAt, at));
  switch (status) {
    case undefined:
      return undefined;
    case "awaiting":
      return and(pending, live);
    case "closed":
      return or(inArray(contracts.status, ["declined", "void", "expired"]), lapsed);
    case "sent":
    case "viewed":
      return and(eq(contracts.status, status), live);
    case "expired":
      return or(eq(contracts.status, "expired"), lapsed);
    default:
      return eq(contracts.status, status);
  }
}

// ─── Queries ────────────────────────────────────────────────────────────────

export async function listContracts(
  actor: Actor,
  input: z.output<typeof listContractsInput> = {},
  now = Date.now(),
) {
  assertReader(actor);
  const templates = !!input.templates && isAdmin(actor);
  const rows = await db.query.contracts.findMany({
    where: and(
      scopeWhere(actor),
      eq(contracts.isTemplate, templates),
      templates ? undefined : statusWhere(input.status, now),
      input.clientId ? eq(contracts.clientId, input.clientId) : undefined,
      input.projectId ? eq(contracts.projectId, input.projectId) : undefined,
      input.q ? like(contracts.title, `%${input.q}%`) : undefined,
    ),
    columns: { bodyMd: false },
    with: {
      client: { columns: { id: true, name: true, color: true } },
      project: { columns: { id: true, name: true, color: true } },
    },
    orderBy: [desc(contracts.updatedAt)],
    limit: input.limit ?? 200,
  });
  return rows.map((r) => ({ ...r, effectiveStatus: effectiveStatus(r, now) }));
}

export type ContractListItem = Awaited<ReturnType<typeof listContracts>>[number];

/** KPIs + tab counters for the list page (owner/admin). */
export function contractStats(
  actor: Actor,
  opts: { now: number; tz: string; calendar: "persian" | "gregory" },
) {
  assertAdmin(actor);
  const docs = eq(contracts.isTemplate, false);
  const n = (where?: SQL) =>
    db.select({ n: count() }).from(contracts).where(and(docs, where)).get()?.n ?? 0;
  const monthStart = startOfMonth(opts.now, opts.tz, opts.calendar);
  const avg = db
    .select({
      ms: sql<number | null>`avg(${contracts.signedAt} - ${contracts.sentAt})`,
      n: count(),
    })
    .from(contracts)
    .where(
      and(
        docs,
        eq(contracts.status, "signed"),
        isNotNull(contracts.sentAt),
        isNotNull(contracts.signedAt),
      ),
    )
    .get();
  const templates =
    db.select({ n: count() }).from(contracts).where(eq(contracts.isTemplate, true)).get()?.n ?? 0;
  return {
    awaiting: n(statusWhere("awaiting", opts.now)),
    viewedAwaiting: n(statusWhere("viewed", opts.now)),
    signedThisMonth: n(and(eq(contracts.status, "signed"), gte(contracts.signedAt, monthStart))),
    avgTimeToSignMs: avg?.ms != null && avg.n > 0 ? Math.max(0, avg.ms) : null,
    signedCount: avg?.n ?? 0,
    tabs: {
      all: n(),
      draft: n(eq(contracts.status, "draft")),
      awaiting: n(statusWhere("awaiting", opts.now)),
      signed: n(eq(contracts.status, "signed")),
      closed: n(statusWhere("closed", opts.now)),
      templates,
    },
  };
}

/** Full document for the panel (owner/admin): events, signatures, integrity. */
export async function getContract(actor: Actor, id: string, now = Date.now()) {
  assertAdmin(actor);
  const c = await db.query.contracts.findFirst({
    where: eq(contracts.id, id),
    with: {
      client: true,
      project: { columns: { id: true, name: true, color: true, clientId: true } },
    },
  });
  if (!c) throw notFound("Contract");
  const events = db
    .select()
    .from(contractEvents)
    .where(eq(contractEvents.contractId, id))
    .orderBy(asc(contractEvents.at))
    .all();
  const signatures = db
    .select()
    .from(contractSignatures)
    .where(eq(contractSignatures.contractId, id))
    .orderBy(asc(contractSignatures.signedAt))
    .all();
  const creator = c.createdBy
    ? db.select({ name: users.name }).from(users).where(eq(users.id, c.createdBy)).get()
    : undefined;
  return {
    contract: c,
    events,
    signatures,
    createdByName: creator?.name ?? null,
    effectiveStatus: effectiveStatus(c, now),
    actions: allowedActions(c, now),
    integrity: {
      /** sha256(bodyMd) === contentHash (null while a draft has no hash yet). */
      verified: c.contentHash ? verifyContent(c) : null,
      currentHash: c.contentHash,
    },
    unresolved: extractPlaceholders(c.bodyMd),
    docLocale: detectDocLocale(c.bodyMd),
    signPath: signPath(c),
    signUrl: signUrl(c),
  };
}

/** Same as getContract but safe for API/MCP output: signature images become flags. */
export async function getContractForApi(actor: Actor, id: string) {
  const d = await getContract(actor, id);
  return {
    ...d,
    signatures: d.signatures.map(({ signatureImage, ...s }) => ({
      ...s,
      drawnSignature: signatureImage ? { present: true } : { present: false },
    })),
  };
}

/** Saved templates with the placeholders they use. */
export function listTemplates(actor: Actor) {
  assertAdmin(actor);
  const rows = db
    .select()
    .from(contracts)
    .where(eq(contracts.isTemplate, true))
    .orderBy(desc(contracts.updatedAt))
    .all();
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    kind: r.kind,
    requireSignature: r.requireSignature,
    updatedAt: r.updatedAt,
    locale: detectDocLocale(r.bodyMd),
    placeholders: extractPlaceholders(r.bodyMd),
    excerpt: markdownToText(r.bodyMd, 180),
  }));
}

/** Built-in starters (offered when no templates exist). */
export function listStarterTemplates() {
  return STARTER_TEMPLATES.map(({ bodyMd, ...s }) => ({
    ...s,
    placeholders: extractPlaceholders(bodyMd),
  }));
}

/** Client pickers for the editor, with a suggested signer (first portal user or client email). */
export function signerSuggestions(actor: Actor) {
  assertAdmin(actor);
  const list = db
    .select({ id: clients.id, name: clients.name, email: clients.email, color: clients.color })
    .from(clients)
    .where(isNull(clients.archivedAt))
    .orderBy(asc(clients.name))
    .all();
  const portalUsers = db
    .select({ clientId: users.clientId, name: users.name, email: users.email })
    .from(users)
    .where(and(eq(users.role, "client"), eq(users.disabled, false)))
    .orderBy(asc(users.createdAt))
    .all();
  return list.map((c) => {
    const u = portalUsers.find((p) => p.clientId === c.id);
    return {
      ...c,
      signerName: u?.name ?? c.name,
      signerEmail: u?.email ?? c.email ?? null,
    };
  });
}

// ─── Templates ──────────────────────────────────────────────────────────────

function templateSource(input: { templateId?: string; starter?: string }) {
  if (input.templateId) {
    const tpl = db
      .select()
      .from(contracts)
      .where(and(eq(contracts.id, input.templateId), eq(contracts.isTemplate, true)))
      .get();
    if (!tpl) throw notFound("Template");
    return {
      title: tpl.title,
      kind: tpl.kind,
      requireSignature: tpl.requireSignature,
      bodyMd: tpl.bodyMd,
    };
  }
  if (input.starter) {
    const s = findStarter(input.starter);
    if (!s) throw notFound("Starter template");
    return { title: s.title, kind: s.kind, requireSignature: s.requireSignature, bodyMd: s.bodyMd };
  }
  return null;
}

/**
 * Render a template (saved or starter) for the editor without saving:
 * placeholders are filled from the chosen client/project/settings.
 */
export function applyTemplate(actor: Actor, input: z.output<typeof applyTemplateInput>) {
  assertAdmin(actor);
  const src = templateSource(input);
  if (!src) throw new AppError("validation", "templateId or starter is required");
  const locale = detectDocLocale(src.bodyMd);
  const values = placeholderValues({
    clientId: input.clientId,
    projectId: input.projectId,
    locale,
    extra: input.values,
  });
  const body = fillPlaceholders(src.bodyMd, values);
  const title = fillPlaceholders(src.title, values);
  return {
    title: title.text,
    kind: src.kind,
    requireSignature: src.requireSignature,
    bodyMd: body.text,
    unresolved: [...new Set([...title.unresolved, ...body.unresolved])],
  };
}

/** Create the built-in starters as editable templates (skips ones already present by title). */
export function installStarterTemplates(actor: Actor, keys?: string[]) {
  assertAdmin(actor);
  const existing = new Set(
    db
      .select({ title: contracts.title })
      .from(contracts)
      .where(eq(contracts.isTemplate, true))
      .all()
      .map((r) => r.title),
  );
  const created: string[] = [];
  for (const s of STARTER_TEMPLATES) {
    if (keys?.length && !keys.includes(s.key)) continue;
    if (existing.has(s.title)) continue;
    const row = db
      .insert(contracts)
      .values({
        title: s.title,
        kind: s.kind,
        requireSignature: s.requireSignature,
        bodyMd: s.bodyMd,
        isTemplate: true,
        createdBy: actor.user.id,
      })
      .returning({ id: contracts.id })
      .get();
    created.push(row.id);
  }
  if (created.length)
    logActivity(actor, "contract.templates_installed", "contract", null, `${created.length}`);
  return { created: created.length, ids: created };
}

// ─── Mutations (owner/admin) ────────────────────────────────────────────────

export function createContract(actor: Actor, input: z.output<typeof contractInput>) {
  assertAdmin(actor);
  const src = templateSource(input);
  const isTemplate = !!input.isTemplate;
  const projectId = input.projectId ?? null;
  const clientId = input.clientId ?? projectClientId(projectId);
  assertRefs(clientId, projectId);

  let title = (input.title || src?.title || "").trim();
  let body = normalizeBody(input.bodyMd ?? src?.bodyMd ?? "");
  if (!isTemplate) {
    const values = placeholderValues({
      clientId,
      projectId,
      locale: input.locale ?? detectDocLocale(body || title),
      extra: input.values,
    });
    body = fillPlaceholders(body, values).text;
    title = fillPlaceholders(title, values).text;
  }
  if (!title)
    throw new AppError("validation", "Title is required", { title: ["Title is required"] });

  const expiresAt = expiryFromDay(input.expiresAt) ?? null;
  const row = db
    .insert(contracts)
    .values({
      title,
      kind: input.kind ?? src?.kind ?? "contract",
      clientId: isTemplate ? null : clientId,
      projectId: isTemplate ? null : projectId,
      bodyMd: body,
      requireSignature: input.requireSignature ?? src?.requireSignature ?? true,
      isTemplate,
      expiresAt: isTemplate ? null : expiresAt,
      signerName: isTemplate ? null : (input.signerName ?? null),
      signerEmail: isTemplate ? null : (input.signerEmail ?? null),
      createdBy: actor.user.id,
    })
    .returning()
    .get();
  if (!isTemplate)
    event(row.id, "created", {
      ...(input.templateId && { templateId: input.templateId }),
      ...(input.starter && { starter: input.starter }),
      via: actor.via,
    });
  logActivity(
    actor,
    isTemplate ? "contract.template_create" : "contract.create",
    "contract",
    row.id,
    title,
  );
  return {
    ...row,
    unresolved: extractPlaceholders(row.bodyMd),
    panelPath: `/panel/contracts/${row.id}`,
  };
}

export function updateContract(
  actor: Actor,
  { id, ...input }: z.output<typeof updateContractInput>,
  now = Date.now(),
) {
  assertAdmin(actor);
  const c = load(id);
  assertCan(c, "edit", now);

  const projectId = input.projectId !== undefined ? input.projectId : c.projectId;
  const clientId =
    input.clientId !== undefined
      ? input.clientId
      : input.projectId
        ? (projectClientId(input.projectId) ?? c.clientId)
        : c.clientId;
  assertRefs(clientId, projectId);

  let nextTitle = input.title !== undefined ? input.title.trim() : c.title;
  let nextBody = input.bodyMd !== undefined ? normalizeBody(input.bodyMd) : c.bodyMd;
  if (!c.isTemplate && (input.bodyMd !== undefined || input.title !== undefined)) {
    const values = placeholderValues({
      clientId,
      projectId,
      locale: input.locale ?? detectDocLocale(nextBody || nextTitle),
      extra: input.values,
    });
    nextBody = fillPlaceholders(nextBody, values).text;
    nextTitle = fillPlaceholders(nextTitle, values).text;
  }
  if (!nextTitle) throw new ContractRuleError("empty_title", "Title is required", "title");
  const nextExpires =
    input.expiresAt !== undefined ? (expiryFromDay(input.expiresAt) ?? null) : c.expiresAt;
  const nextRequire = input.requireSignature ?? c.requireSignature;

  const plan = planEdit(
    c,
    { title: nextTitle, bodyMd: nextBody, requireSignature: nextRequire, expiresAt: nextExpires },
    now,
    contentHash,
  );
  if (plan.kind === "locked")
    throw new ContractRuleError(
      plan.reason === "signed" ? "locked_signed" : "locked_void",
      "This document can no longer be edited.",
    );
  const willBeLive =
    plan.kind === "reissue" || (plan.kind === "metadata" && isPendingStatus(plan.status));
  if (!c.isTemplate && willBeLive && nextExpires && nextExpires.getTime() <= now)
    throw new ContractRuleError("expiry_past", "The expiry date is in the past.", "expiresAt");
  if (plan.kind === "reissue" && !nextBody.trim())
    throw new ContractRuleError("empty_body", "The document body is empty.", "bodyMd");

  const meta = {
    ...(input.kind !== undefined && { kind: input.kind }),
    clientId: c.isTemplate ? null : clientId,
    projectId: c.isTemplate ? null : projectId,
    ...(!c.isTemplate && {
      expiresAt: nextExpires,
      ...(input.signerName !== undefined && { signerName: input.signerName }),
      ...(input.signerEmail !== undefined && { signerEmail: input.signerEmail }),
    }),
  };
  const content = { title: nextTitle, bodyMd: nextBody, requireSignature: nextRequire };

  const set =
    plan.kind === "draft"
      ? { ...meta, ...content }
      : plan.kind === "reissue"
        ? {
            ...meta,
            ...content,
            version: plan.version,
            contentHash: plan.contentHash,
            status: plan.status,
            declinedAt: null,
            declineReason: null,
          }
        : { ...meta, status: plan.status };

  const row = db.update(contracts).set(set).where(eq(contracts.id, id)).returning().get();
  if (!c.isTemplate && c.status !== "draft") {
    event(id, "updated", {
      version: row.version,
      reissued: plan.kind === "reissue",
      ...(plan.kind === "reissue" && {
        fromVersion: plan.fromVersion,
        contentHash: plan.contentHash,
        previousStatus: effectiveStatus(c, now),
      }),
      via: actor.via,
    });
  }
  logActivity(actor, "contract.update", "contract", id, row.title, {
    reissued: plan.kind === "reissue",
    version: row.version,
  });
  return { ...row, reissued: plan.kind === "reissue", unresolved: extractPlaceholders(row.bodyMd) };
}

/**
 * Draft → sent: creates the private signing link and pins the text
 * (contentHash + version). For an already-sent document it just returns the
 * link (idempotent "get link").
 */
export function sendContract(
  actor: Actor,
  input: z.output<typeof sendContractInput>,
  now = Date.now(),
) {
  assertAdmin(actor);
  const c = load(input.id);
  if (c.isTemplate)
    throw new ContractRuleError("template_not_sendable", "Templates cannot be sent.");
  assertCan(c, "send", now);
  if (c.status === "draft") {
    if (!c.bodyMd.trim())
      throw new ContractRuleError("empty_body", "The document body is empty.", "bodyMd");
    const expiresAt = input.expiresAt !== undefined ? expiryFromDay(input.expiresAt) : c.expiresAt;
    if (expiresAt && expiresAt.getTime() <= now)
      throw new ContractRuleError("expiry_past", "The expiry date is in the past.", "expiresAt");
    const hash = contentHash(c.bodyMd);
    const row = db
      .update(contracts)
      .set({
        status: "sent",
        shareToken: c.shareToken ?? newToken(24),
        sentAt: new Date(now),
        contentHash: hash,
        expiresAt: expiresAt ?? null,
      })
      .where(and(eq(contracts.id, c.id), eq(contracts.status, "draft")))
      .returning()
      .get();
    if (!row) throw new ContractRuleError("not_allowed", "The document is no longer a draft.");
    event(c.id, "sent", { version: row.version, contentHash: hash, via: actor.via });
    logActivity(actor, "contract.send", "contract", c.id, c.title);
    return linkResult(row, true);
  }
  return linkResult(c, false);
}

function linkResult(c: Row, justSent: boolean) {
  return {
    id: c.id,
    status: c.status,
    version: c.version,
    contentHash: c.contentHash,
    expiresAt: c.expiresAt,
    signPath: signPath(c),
    signUrl: signUrl(c),
    justSent,
  };
}

/** Log a reminder (the owner re-shares the link) and return the link. */
export function remindContract(actor: Actor, id: string, now = Date.now()) {
  assertAdmin(actor);
  const c = load(id);
  assertCan(c, "remind", now);
  event(id, "reminded", { version: c.version, via: actor.via });
  logActivity(actor, "contract.remind", "contract", id, c.title);
  return linkResult(c, false);
}

export function voidContract(
  actor: Actor,
  input: z.output<typeof voidContractInput>,
  now = Date.now(),
) {
  assertAdmin(actor);
  const c = load(input.id);
  assertCan(c, "void", now);
  const row = db
    .update(contracts)
    .set({ status: "void" })
    .where(eq(contracts.id, c.id))
    .returning()
    .get();
  event(c.id, "voided", {
    reason: input.reason ?? null,
    previousStatus: effectiveStatus(c, now),
    via: actor.via,
  });
  logActivity(actor, "contract.void", "contract", c.id, c.title);
  return row;
}

/** Only drafts and templates can be deleted (everything else keeps its audit trail). */
export function deleteContract(actor: Actor, id: string, now = Date.now()) {
  assertAdmin(actor);
  const c = load(id);
  assertCan(c, "delete", now);
  db.delete(contracts).where(eq(contracts.id, id)).run();
  logActivity(
    actor,
    c.isTemplate ? "contract.template_delete" : "contract.delete",
    "contract",
    id,
    c.title,
  );
}

export function duplicateContract(actor: Actor, input: z.output<typeof duplicateContractInput>) {
  assertAdmin(actor);
  const c = load(input.id);
  const fa = detectDocLocale(c.title + c.bodyMd) === "fa";
  const title = input.asNewVersion ? c.title : `${c.title} ${fa ? "(نسخه کپی)" : "(copy)"}`;
  const row = db
    .insert(contracts)
    .values({
      title: title.slice(0, 300),
      kind: c.kind,
      clientId: c.clientId,
      projectId: c.projectId,
      bodyMd: c.bodyMd,
      requireSignature: c.requireSignature,
      isTemplate: c.isTemplate,
      signerName: c.signerName,
      signerEmail: c.signerEmail,
      createdBy: actor.user.id,
    })
    .returning()
    .get();
  if (!row.isTemplate)
    event(row.id, "created", {
      duplicatedFrom: c.id,
      fromVersion: c.version,
      fromStatus: c.status,
      via: actor.via,
    });
  logActivity(actor, "contract.duplicate", "contract", row.id, row.title, { from: c.id });
  return row;
}

export function saveAsTemplate(actor: Actor, input: z.output<typeof saveAsTemplateInput>) {
  assertAdmin(actor);
  const src =
    "id" in input
      ? (() => {
          const c = load(input.id);
          return {
            title: input.title ?? c.title,
            kind: c.kind,
            requireSignature: c.requireSignature,
            bodyMd: c.bodyMd,
          };
        })()
      : { ...input, requireSignature: input.requireSignature ?? true };
  const row = db
    .insert(contracts)
    .values({
      title: src.title.slice(0, 300),
      kind: src.kind,
      requireSignature: src.requireSignature,
      bodyMd: normalizeBody(src.bodyMd),
      isTemplate: true,
      createdBy: actor.user.id,
    })
    .returning()
    .get();
  logActivity(actor, "contract.template_create", "contract", row.id, row.title);
  return row;
}

/** Owner/admin counter-signature (role "owner") on the current version. */
export function countersignContract(
  actor: Actor,
  input: z.output<typeof countersignInput>,
  req: { ip: string | null; userAgent: string | null },
  now = Date.now(),
) {
  assertAdmin(actor);
  const c = load(input.id);
  assertCan(c, "countersign", now);
  if (!input.signatureImage && !input.typedName)
    throw new ContractRuleError("signature_required", "Draw or type a signature.");
  if (input.signatureImage && !isValidSignatureImage(input.signatureImage))
    throw new ContractRuleError("invalid_signature", "Invalid signature image.");
  const hash = c.contentHash ?? contentHash(c.bodyMd);
  return db.transaction((tx) => {
    const dup = tx
      .select({ id: contractSignatures.id })
      .from(contractSignatures)
      .where(
        and(
          eq(contractSignatures.contractId, c.id),
          eq(contractSignatures.role, "owner"),
          eq(contractSignatures.version, c.version),
        ),
      )
      .get();
    if (dup)
      throw new ContractRuleError(
        "already_countersigned",
        "This version is already countersigned.",
      );
    const sig = tx
      .insert(contractSignatures)
      .values({
        contractId: c.id,
        role: "owner",
        name: input.name,
        email: actor.user.email,
        signatureImage: input.signatureImage ?? null,
        typedName: input.typedName ?? null,
        contentHash: hash,
        version: c.version,
        ip: req.ip,
        userAgent: req.userAgent?.slice(0, 500) ?? null,
      })
      .returning({ id: contractSignatures.id })
      .get();
    tx.insert(contractEvents)
      .values({
        contractId: c.id,
        type: "signed",
        ip: req.ip,
        userAgent: req.userAgent?.slice(0, 500) ?? null,
        meta: { role: "owner", version: c.version, contentHash: hash, userId: actor.user.id },
      })
      .run();
    logActivity(actor, "contract.countersign", "contract", c.id, c.title);
    return sig;
  });
}

// ─── Public signing (token-gated, no session) ──────────────────────────────

function byToken(token: string) {
  if (!token || token.length < 16 || token.length > 64) return null;
  return (
    db
      .select()
      .from(contracts)
      .where(and(eq(contracts.shareToken, token), eq(contracts.isTemplate, false)))
      .get() ?? null
  );
}

/** Everything the public signing page shows. Null for unknown tokens and drafts. */
export async function getPublicContract(token: string, now = Date.now()) {
  const c = byToken(token);
  if (!c || c.status === "draft") return null;
  const [client, project] = [
    c.clientId
      ? db.select({ name: clients.name }).from(clients).where(eq(clients.id, c.clientId)).get()
      : undefined,
    c.projectId
      ? db.select({ name: projects.name }).from(projects).where(eq(projects.id, c.projectId)).get()
      : undefined,
  ];
  const signatures = db
    .select({
      id: contractSignatures.id,
      role: contractSignatures.role,
      name: contractSignatures.name,
      typedName: contractSignatures.typedName,
      signatureImage: contractSignatures.signatureImage,
      version: contractSignatures.version,
      contentHash: contractSignatures.contentHash,
      ip: contractSignatures.ip,
      signedAt: contractSignatures.signedAt,
    })
    .from(contractSignatures)
    .where(eq(contractSignatures.contractId, c.id))
    .orderBy(asc(contractSignatures.signedAt))
    .all()
    // The owner's IP is not the signer's business.
    .map((s) => (s.role === "owner" ? { ...s, ip: null } : s));
  const docLocale = detectDocLocale(c.bodyMd);
  return {
    contract: {
      id: c.id,
      title: c.title,
      kind: c.kind,
      bodyMd: c.bodyMd,
      status: c.status,
      effectiveStatus: effectiveStatus(c, now),
      version: c.version,
      contentHash: c.contentHash,
      requireSignature: c.requireSignature,
      signerName: c.signerName,
      signerEmail: c.signerEmail,
      sentAt: c.sentAt,
      signedAt: c.signedAt,
      declinedAt: c.declinedAt,
      declineReason: c.declineReason,
      expiresAt: c.expiresAt,
      clientName: client?.name ?? null,
      projectName: project?.name ?? null,
    },
    signatures,
    docLocale,
    brand: brandAndOwner(docLocale),
  };
}

export type PublicContract = NonNullable<Awaited<ReturnType<typeof getPublicContract>>>;

const VIEW_DEDUPE_MS = 60 * 60 * 1000;

/**
 * Record that the signer opened the link. First view of a sent version moves
 * it to "viewed" (+ firstViewedAt, admin notification). A "viewed" event is
 * appended at most once per IP per hour.
 */
export function recordContractView(
  token: string,
  req: { ip: string | null; userAgent: string | null },
  now = Date.now(),
) {
  const c = byToken(token);
  if (!c || !isPendingStatus(effectiveStatus(c, now))) return { recorded: false };
  const at = new Date(now);
  const result = db.transaction((tx) => {
    let firstOfVersion = false;
    if (c.status === "sent") {
      const moved = tx
        .update(contracts)
        .set({ status: "viewed", firstViewedAt: c.firstViewedAt ?? at })
        .where(and(eq(contracts.id, c.id), eq(contracts.status, "sent")))
        .returning({ id: contracts.id })
        .get();
      firstOfVersion = !!moved;
    }
    const recent = tx
      .select({ id: contractEvents.id })
      .from(contractEvents)
      .where(
        and(
          eq(contractEvents.contractId, c.id),
          eq(contractEvents.type, "viewed"),
          req.ip ? eq(contractEvents.ip, req.ip) : isNull(contractEvents.ip),
          gt(contractEvents.at, new Date(now - VIEW_DEDUPE_MS)),
        ),
      )
      .get();
    if (!recent) {
      tx.insert(contractEvents)
        .values({
          contractId: c.id,
          type: "viewed",
          ip: req.ip,
          userAgent: req.userAgent?.slice(0, 500) ?? null,
          meta: { version: c.version },
          at,
        })
        .run();
    }
    return { recorded: !recent, firstOfVersion };
  });
  if (result.firstOfVersion) {
    notifyAdminsLocalized("contract.viewed", `/panel/contracts/${c.id}`, (t, l) => ({
      title: format(t.notifyViewedTitle, { title: c.title }),
      body: format(t.notifyViewedBody, { version: formatNumber(c.version, l) }),
    }));
  }
  return { recorded: result.recorded };
}

export type SignOutcome = "signed" | "declined" | "closed" | "expired" | "changed" | "not_found";

/** Public signature by the client (token link). Never throws for business outcomes. */
export function signContractPublic(
  input: z.output<typeof signContractInput>,
  req: { ip: string | null; userAgent: string | null },
  now = Date.now(),
): { outcome: SignOutcome } {
  const c = byToken(input.token);
  if (!c || c.status === "draft") return { outcome: "not_found" };
  let method: "drawn" | "typed" | "drawn+typed" | "approval" = "approval";
  if (c.requireSignature) {
    if (!input.signatureImage && !input.typedName)
      throw new AppError("validation", "Signature required", {
        signatureImage: ["Draw or type your signature"],
      });
    if (input.signatureImage && !isValidSignatureImage(input.signatureImage))
      throw new AppError("validation", "Invalid signature", {
        signatureImage: ["Invalid signature image"],
      });
    method =
      input.signatureImage && input.typedName
        ? "drawn+typed"
        : input.signatureImage
          ? "drawn"
          : "typed";
  }
  const ua = req.userAgent?.slice(0, 500) ?? null;
  const outcome = db.transaction((tx): SignOutcome => {
    // Re-read inside the transaction so concurrent requests can't double-sign.
    const cur = tx.select().from(contracts).where(eq(contracts.id, c.id)).get();
    if (!cur) return "not_found";
    const check = checkSignable(cur, input, now);
    if (!check.ok) return check.reason === "signed" ? "closed" : check.reason;
    const at = new Date(now);
    tx.insert(contractSignatures)
      .values({
        contractId: cur.id,
        role: "client",
        name: input.name,
        email: input.email ?? null,
        signatureImage: c.requireSignature ? (input.signatureImage ?? null) : null,
        typedName: c.requireSignature ? (input.typedName ?? null) : null,
        contentHash: cur.contentHash!,
        version: cur.version,
        ip: req.ip,
        userAgent: ua,
        signedAt: at,
      })
      .run();
    tx.update(contracts)
      .set({
        status: "signed",
        signedAt: at,
        signerName: input.name,
        signerEmail: input.email ?? cur.signerEmail,
      })
      .where(eq(contracts.id, cur.id))
      .run();
    tx.insert(contractEvents)
      .values({
        contractId: cur.id,
        type: "signed",
        ip: req.ip,
        userAgent: ua,
        meta: {
          role: "client",
          version: cur.version,
          contentHash: cur.contentHash,
          method,
          name: input.name,
        },
        at,
      })
      .run();
    return "signed";
  });
  if (outcome === "signed") {
    logActivity(null, "contract.signed", "contract", c.id, c.title, { name: input.name });
    notifyAdminsLocalized("contract.signed", `/panel/contracts/${c.id}`, (t, l) => ({
      title: format(c.requireSignature ? t.notifySignedTitle : t.notifyApprovedTitle, {
        title: c.title,
      }),
      body: format(t.notifySignedBody, { name: input.name, version: formatNumber(c.version, l) }),
    }));
  }
  return { outcome };
}

export function declineContractPublic(
  input: z.output<typeof declineContractInput>,
  req: { ip: string | null; userAgent: string | null },
  now = Date.now(),
): { outcome: SignOutcome } {
  const c = byToken(input.token);
  if (!c || c.status === "draft") return { outcome: "not_found" };
  const ua = req.userAgent?.slice(0, 500) ?? null;
  const outcome = db.transaction((tx): SignOutcome => {
    const cur = tx.select().from(contracts).where(eq(contracts.id, c.id)).get();
    if (!cur) return "not_found";
    const check = checkSignable(cur, input, now);
    if (!check.ok) return check.reason === "signed" ? "closed" : check.reason;
    const at = new Date(now);
    tx.update(contracts)
      .set({ status: "declined", declinedAt: at, declineReason: input.reason ?? null })
      .where(eq(contracts.id, cur.id))
      .run();
    tx.insert(contractEvents)
      .values({
        contractId: cur.id,
        type: "declined",
        ip: req.ip,
        userAgent: ua,
        meta: { version: cur.version, reason: input.reason ?? null, name: input.name ?? null },
        at,
      })
      .run();
    return "declined";
  });
  if (outcome === "declined") {
    logActivity(null, "contract.declined", "contract", c.id, c.title);
    notifyAdminsLocalized("contract.declined", `/panel/contracts/${c.id}`, (t) => ({
      title: format(t.notifyDeclinedTitle, { title: c.title }),
      body: input.reason ?? undefined,
    }));
  }
  return { outcome };
}

/** Contract statuses for status badges (re-exported for UI code via props). */
export type { ContractStatus };
