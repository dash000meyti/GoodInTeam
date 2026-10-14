"use client";

import { ArchiveRestoreIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-button";
import { useAction } from "@/components/shared/use-action-form";
import { useT } from "@/i18n/client";
import { archiveDocAction, deleteDocAction } from "@/server/modules/docs/actions";

/** Restore / delete buttons for one archived page. */
export function ArchiveRowActions({ id, canManage }: { id: string; canManage: boolean }) {
  const t = useT();
  const d = t.docs;
  const { exec, pending } = useAction();
  if (!canManage) return null;
  return (
    <div className="flex shrink-0 gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => exec(archiveDocAction({ id, archived: false }), d.restored)}
      >
        <ArchiveRestoreIcon /> {d.restore}
      </Button>
      <ConfirmDialog
        description={d.deleteConfirmBody}
        onConfirm={() => exec(deleteDocAction({ id }), d.deleted)}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label={t.common.delete} disabled={pending}>
            <Trash2Icon className="text-destructive" />
          </Button>
        }
      />
    </div>
  );
}
