import { z } from "zod";
import {
  billingTypes,
  milestoneStatuses,
  progressModes,
  projectStatuses,
  projectUpdateKinds,
} from "@/server/db/schema";
import {
  zBool,
  zColor,
  zCurrency,
  zId,
  zNullDay,
  zNullNumberOf,
  zNullString,
  zOptDay,
  zOptNumberOf,
  zOptString,
  zTags,
} from "@/lib/zod-helpers";

const nonNegative = () => z.number().min(0);
const progressValue = () => z.number().int().min(0).max(100);
const milestoneWeight = () => z.number().int().min(1).max(100);

/**
 * Create input. Defaults apply here only — never derive the update schema from
 * this one (zod 4 `.partial()` still applies `.default()`s, so a partial update
 * would silently reset fields).
 */
export const projectInput = z.object({
  name: z.string().trim().min(1).max(200),
  clientId: zNullString(64),
  description: zNullString(20_000),
  status: z.enum(projectStatuses).default("active"),
  color: zColor.default("#00A76F"),
  /** Calendar day "YYYY-MM-DD" (or ISO date-time). Converted with the app timezone. */
  startDate: zOptDay,
  dueDate: zOptDay,
  billingType: z.enum(billingTypes).default("hourly"),
  currency: zCurrency.default("IRT"),
  /** Major units as typed by the user, e.g. "1500000", "۱٬۵۰۰٬۰۰۰" or "120.5". */
  budget: zOptNumberOf(nonNegative()),
  hourlyRate: zOptNumberOf(nonNegative()),
  estimateHours: zOptNumberOf(nonNegative()),
  progress: zOptNumberOf(progressValue()),
  progressMode: z.enum(progressModes).default("milestones"),
  websiteUrl: zNullString(500),
  repoUrl: zNullString(500),
  tags: zTags.optional(),
  portalEnabled: zBool.optional(),
  shareProgress: zBool.optional(),
  shareTime: zBool.optional(),
  shareTasks: zBool.optional(),
  shareFinance: zBool.optional(),
  shareDocs: zBool.optional(),
});
export type ProjectInput = z.input<typeof projectInput>;

/**
 * Partial update: a key that is absent (or `undefined`) leaves the field
 * untouched; `""` / `null` clears nullable fields (dates, money, estimate,
 * client, description, URLs). No defaults.
 */
export const updateProjectInput = z.object({
  id: zId,
  name: z.string().trim().min(1).max(200).optional(),
  clientId: zNullString(64),
  description: zNullString(20_000),
  status: z.enum(projectStatuses).optional(),
  color: zColor.optional(),
  startDate: zNullDay,
  dueDate: zNullDay,
  billingType: z.enum(billingTypes).optional(),
  currency: zCurrency.optional(),
  budget: zNullNumberOf(nonNegative()),
  hourlyRate: zNullNumberOf(nonNegative()),
  estimateHours: zNullNumberOf(nonNegative()),
  progress: zOptNumberOf(progressValue()),
  progressMode: z.enum(progressModes).optional(),
  websiteUrl: zNullString(500),
  repoUrl: zNullString(500),
  tags: zTags.optional(),
  portalEnabled: zBool.optional(),
  shareProgress: zBool.optional(),
  shareTime: zBool.optional(),
  shareTasks: zBool.optional(),
  shareFinance: zBool.optional(),
  shareDocs: zBool.optional(),
});
export type UpdateProjectInput = z.input<typeof updateProjectInput>;

export const listProjectsInput = z.object({
  status: z.enum(projectStatuses).optional(),
  clientId: zOptString(64),
  q: zOptString(200),
  includeArchived: z.boolean().optional(),
});

export const milestoneInput = z.object({
  projectId: zId,
  title: z.string().trim().min(1).max(300),
  description: zNullString(5000),
  status: z.enum(milestoneStatuses).default("planned"),
  dueDate: zOptDay,
  weight: zOptNumberOf(milestoneWeight()).transform((w) => w ?? 1),
  visibleToClient: zBool.default(true),
});

/** Partial milestone update (absent = untouched, no defaults; can't move projects). */
export const updateMilestoneInput = z.object({
  id: zId,
  title: z.string().trim().min(1).max(300).optional(),
  description: zNullString(5000),
  status: z.enum(milestoneStatuses).optional(),
  dueDate: zNullDay,
  weight: zOptNumberOf(milestoneWeight()),
  visibleToClient: zBool.optional(),
});

export const projectUpdateInput = z.object({
  projectId: zId,
  kind: z.enum(projectUpdateKinds).default("update"),
  title: z.string().trim().min(1).max(300),
  bodyMd: zNullString(50_000),
  visibleToClient: zBool.default(true),
});
