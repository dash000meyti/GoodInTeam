import "server-only";
import { headers } from "next/headers";
import { env } from "@/lib/env";
import { clientIp } from "./client-ip";

/**
 * Client IP + UA for rate limits and audit logs. The IP source depends on
 * `TRUST_PROXY` (see ./client-ip.ts) so clients can't forge it via headers.
 */
export async function requestMeta() {
  const h = await headers();
  return { ip: clientIp(h, env.trustProxy), userAgent: h.get("user-agent") };
}
