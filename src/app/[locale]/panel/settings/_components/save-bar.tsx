"use client";

import { Loader2Icon, SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/** Sticky save bar for long settings forms (shows when there are unsaved edits). */
export function SaveBar({ pending, dirty }: { pending: boolean; dirty: boolean }) {
  const t = useT();
  return (
    <div className="sticky bottom-4 z-20">
      <div
        className={cn(
          "glass flex items-center justify-end gap-3 rounded-2xl border p-2.5 shadow-dropdown transition-colors",
          dirty && "border-primary/30",
        )}
      >
        <span
          className={cn(
            "flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-opacity",
            dirty ? "opacity-100" : "opacity-0",
          )}
          aria-live="polite"
        >
          <span className="size-2 animate-pulse rounded-full bg-warning" aria-hidden />
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
