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
  zId,
  zNullString,
  zOptDate,
  zOptInt,
  zOptNumber,
  zOptString,
  zTags,
} from "@/lib/zod-helpers";

export const projectInput = z.object({
  name: z.string().trim().min(1).max(200),
  clientId: zNullString(64),
  description: zNullString(20_000),
  status: z.enum(projectStatuses).default("active"),
  color: zColor.default("#00A76F"),
  /** Calendar day "YYYY-MM-DD" or a Date. Converted with the app timezone. */
  startDate: zOptString(30),
  dueDate: zOptString(30),
  billingType: z.enum(billingTypes).default("hourly"),
  currency: z.string().max(8).default("IRT"),
  /** Major units as typed by the user, e.g. "1500000" or "120.5". */
  budget: zOptNumber,
  hourlyRate: zOptNumber,
  estimateHours: zOptNumber,
  progress: zOptInt,
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

export const updateProjectInput = projectInput.partial().extend({ id: zId });

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
  dueDate: zOptString(30),
  weight: z.coerce.number().int().min(1).max(100).default(1),
  visibleToClient: zBool.default(true),
});
export const updateMilestoneInput = milestoneInput.partial().extend({ id: zId });

export const projectUpdateInput = z.object({
  projectId: zId,
  kind: z.enum(projectUpdateKinds).default("update"),
  title: z.string().trim().min(1).max(300),
  bodyMd: zNullString(50_000),
  visibleToClient: zBool.default(true),
});

export { zOptDate };
