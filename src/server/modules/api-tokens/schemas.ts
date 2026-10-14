import { z } from "zod";
import { apiTokenScopes } from "@/server/db/schema/auth";

/** Expiry presets offered in the UI (0 = never expires). */
export const tokenExpiryPresets = [7, 30, 90, 365, 0] as const;

export const createTokenInput = z.object({
  name: z.string().trim().min(1).max(100),
  /** ["read"] or ["read","write"]. Accepts a comma-separated string from forms. */
  scopes: z.preprocess(
    (v) => (typeof v === "string" ? v.split(",").map((x) => x.trim()) : v),
    z.array(z.enum(apiTokenScopes)).min(1).default(["read"]),
  ),
  /** Days until expiry; empty / 0 = never. */
  expiresInDays: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.coerce.number().int().min(0).max(3650).optional(),
  ),
});
