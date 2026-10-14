import { z } from "zod";
import { clientKinds } from "@/server/db/schema";
import { zId, zNullString, zOptString, zTags } from "@/lib/zod-helpers";

export const clientInput = z.object({
  name: z.string().trim().min(1).max(200),
  kind: z.enum(clientKinds).default("company"),
  email: zNullString(200),
  phone: zNullString(50),
  website: zNullString(500),
  address: zNullString(1000),
  taxId: zNullString(100),
  notes: zNullString(10_000),
  color: zNullString(16),
  defaultCurrency: z.string().max(8).default("IRT"),
  tags: zTags.optional(),
});
export type ClientInput = z.input<typeof clientInput>;

export const updateClientInput = clientInput.partial().extend({ id: zId });

export const inviteClientUserInput = z.object({
  clientId: zId,
  name: z.string().trim().min(1).max(200),
  email: z.email().max(200),
  locale: z.enum(["fa", "en"]).default("fa"),
});

export const listClientsInput = z.object({
  q: zOptString(200),
  includeArchived: z.boolean().optional(),
});
