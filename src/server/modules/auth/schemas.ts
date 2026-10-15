import { z } from "zod";
import { MAX_NEXT_LENGTH } from "@/server/auth/safe-next";

export const loginInput = z.object({
  email: z.email().max(200),
  password: z.string().min(1).max(500),
  /** Post-login redirect target; an over-long value is dropped (see safeNext). */
  next: z.string().max(MAX_NEXT_LENGTH).optional().catch(undefined),
});

export const setupInput = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().max(200),
  password: z.string().min(10).max(500),
});

/** Opaque session handle as shown in Settings → Sessions (not the DB id). */
export const sessionHandleInput = z.object({ id: z.string().min(8).max(64) });
