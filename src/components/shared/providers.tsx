"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { Direction } from "radix-ui";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

/** App-wide client providers (mounted once in the root layout). */
export function Providers({ dir, children }: { dir: "rtl" | "ltr"; children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <Direction.DirectionProvider dir={dir}>
        <TooltipProvider>
          {children}
          <Toaster position={dir === "rtl" ? "bottom-left" : "bottom-right"} dir={dir} />
        </TooltipProvider>
      </Direction.DirectionProvider>
    </ThemeProvider>
  );
}
