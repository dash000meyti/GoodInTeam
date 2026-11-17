"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { Direction } from "radix-ui";

/**
 * The theme script only has to run from the server HTML (before first paint).
 * When the root `[locale]` layout remounts on the client (a cross-locale
 * redirect, a not-found), React would warn "Encountered a script tag…": a
 * data-block type keeps that client copy inert and silent. The mismatch is
 * covered by next-themes' `suppressHydrationWarning` on the script.
 */
const themeScriptProps =
  typeof window === "undefined" ? undefined : ({ type: "application/json" } as const);

/**
 * App-wide client providers (mounted once in the root layout). Tooltips and
 * toasts live in <InteractiveProviders> (panel, signing page) to keep public
 * pages light.
 */
export function Providers({ dir, children }: { dir: "rtl" | "ltr"; children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      scriptProps={themeScriptProps}
    >
      <Direction.DirectionProvider dir={dir}>{children}</Direction.DirectionProvider>
    </ThemeProvider>
  );
}
