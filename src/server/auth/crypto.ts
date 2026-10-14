import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

export function sha256(input: string) {
  return createHash("sha256").update(input).digest("hex");
}

/** HMAC with the app secret (used for API token hashing so a DB leak alone is useless). */
export function hmac(input: string) {
  return createHmac("sha256", env.appSecret).update(input).digest("hex");
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
