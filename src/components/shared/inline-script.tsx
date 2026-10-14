/**
 * Inline <script> that runs before first paint (theme preset, etc.) without
 * React's "script tag rendered" dev warning. See Next.js guide:
 * "Preventing flash before hydration".
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
