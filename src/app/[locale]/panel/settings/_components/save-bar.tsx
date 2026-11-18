"use client";

import { Loader2Icon, SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/**
 * Sticky save bar for long settings forms (shows when there are unsaved
 * edits): a framed box, 95% opaque (no blur), its hairline darkens when dirty.
 */
export function SaveBar({ pending, dirty }: { pending: boolean; dirty: boolean }) {
  const t = useT();
  return (
    <div className="sticky above-dock z-20">
      <div
        data-density="compact"
        className={cn(
          "frame-box flex items-center justify-end gap-3 bg-background/95 p-2.5 transition-colors dark:bg-card/95",
          dirty && "border-foreground/40",
        )}
      >
        <span
          className={cn(
            "flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-opacity",
            dirty ? "opacity-100" : "opacity-0",
          )}
          aria-live="polite"
        >
          <span className="size-2 animate-pulse bg-warning" aria-hidden />
          {dirty ? t.settings.unsavedHint : ""}
        </span>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2Icon className="animate-spin" /> : <SaveIcon />}
          {t.common.save}
        </Button>
      </div>
    </div>
  );
}
