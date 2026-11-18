import "server-only";
import { headers } from "next/headers";
import { AppError } from "@/server/errors";
import { isVouched, vouchedClientIp } from "./edge";

/**
 * Client IP + UA for rate limits and audit logs. The IP source depends on
 * `TRUST_PROXY` (see ./client-ip.ts) so clients can't forge it via headers.
 * Refuses a request the proxy did not vouch for (./edge.ts): without the
 * proxy nobody vetted the forwarding headers.
 */
export async function requestMeta() {
  const h = await headers();
  if (!isVouched(h)) throw new AppError("forbidden", "Request did not pass the proxy");
  return { ip: vouchedClientIp(h), userAgent: h.get("user-agent") };
}
