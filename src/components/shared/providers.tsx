"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { Direction } from "radix-ui";
/**
 * App-wide client providers (mounted once in the root layout). Tooltips and
 * toasts live in <InteractiveProviders> (panel, signing page) to keep public
 * pages light.
 */
export function Providers({ dir, children }: { dir: "rtl" | "ltr"; children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <Direction.DirectionProvider dir={dir}>{children}</Direction.DirectionProvider>
    </ThemeProvider>
  );
}
