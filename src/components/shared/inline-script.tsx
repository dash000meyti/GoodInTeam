"use client";

/**
 * Inline <script> that runs before first paint (theme preset, sidebar state, etc.) without
 * React's "script tag rendered" dev warning. See Next.js guide: "Preventing flash before
 * hydration".
 *
 * A Client Component on purpose: during SSR it emits an executable script; on the client
 * (hydration and soft navigations, e.g. login → panel) `typeof window` is defined, so the
 * tag is inert `text/plain` and React does not warn. The mismatch is suppressed.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
