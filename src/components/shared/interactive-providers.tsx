"use client";

import type { ReactNode } from "react";
import { Direction } from "radix-ui";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

/**
 * Tooltips + toasts for the interactive areas (panel, signing page). Kept out
 * of the root layout so public pages don't ship Radix Tooltip and sonner.
 */
export function InteractiveProviders({ children }: { children: ReactNode }) {
  const dir = Direction.useDirection();
  return (
    <TooltipProvider>
      {children}
      {/* Above the panel dock: panel-shell.css sets --toast-bottom under .panel-shell (§11.6). */}
      <Toaster
        position={dir === "rtl" ? "bottom-left" : "bottom-right"}
        dir={dir}
        offset={{ bottom: "var(--toast-bottom, 24px)" }}
        mobileOffset={{ bottom: "var(--toast-bottom, 16px)" }}
      />
    </TooltipProvider>
  );
}
