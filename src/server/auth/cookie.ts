/**
 * Session cookie settings shared by src/proxy.ts (sliding refresh) and
 * ./session.ts (sign-in), so both always write the same attributes.
 * Pure module (no `server-only`) because the proxy imports it.
 */
export const SESSION_COOKIE = "gt_session";
export const SESSION_DAYS = 30;

/**
 * `Secure` flag: on in production when the public site URL is https. Based on
 * configuration rather than the request, because behind a TLS-terminating
 * proxy the request itself may look like plain http (or carry a forged
 * `x-forwarded-proto`).
 */
export function sessionCookieSecure(
  nodeEnv: string | undefined = process.env.NODE_ENV,
  siteUrl: string | undefined = process.env.NEXT_PUBLIC_SITE_URL,
) {
  return nodeEnv === "production" && (siteUrl ?? "").trim().toLowerCase().startsWith("https://");
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: sessionCookieSecure(),
    path: "/",
  } as const;
}
