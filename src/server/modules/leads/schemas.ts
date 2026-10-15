import { z } from "zod";
import { leadStatuses } from "@/server/db/schema";
import { zId, zOptString } from "@/lib/zod-helpers";

/** Public contact form. `website` is a honeypot (must stay empty). */
export const contactInput = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().trim().max(200),
  phone: zOptString(40),
  company: zOptString(120),
  service: zOptString(120),
  budget: zOptString(40),
  message: z.string().trim().min(10).max(5000),
  source: zOptString(120),
  website: z.string().max(200).optional(),
});

export const listLeadsInput = z.object({
  status: z.enum(leadStatuses).optional(),
  q: zOptString(200),
});

export const updateLeadStatusInput = z.object({
  id: zId,
  status: z.enum(leadStatuses),
});

export const convertLeadInput = z.object({ id: zId });
