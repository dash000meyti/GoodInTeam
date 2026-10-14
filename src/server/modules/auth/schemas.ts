import { z } from "zod";

export const loginInput = z.object({
  email: z.email().max(200),
  password: z.string().min(1).max(500),
  next: z.string().optional(),
});

export const setupInput = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().max(200),
  password: z.string().min(10).max(500),
});
