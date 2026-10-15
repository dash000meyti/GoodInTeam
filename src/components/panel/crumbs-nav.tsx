"use client";

import type { ReactNode } from "react";
import { useT } from "@/i18n/client";

/** Breadcrumb landmark with a translated name (PageHeader renders in server and client trees). */
export function CrumbsNav({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <nav
      aria-label={t.common.breadcrumb}
      className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
    >
      {children}
    </nav>
  );
}
