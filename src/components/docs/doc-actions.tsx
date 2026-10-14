"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  FilePlus2Icon,
  LinkIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PrinterIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/confirm-button";
import { useAction } from "@/components/shared/use-action-form";
import { localePath } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import { archiveDocAction, deleteDocAction } from "@/server/modules/docs/actions";

/** Header actions on a doc page: edit, copy link, print, subpage, archive, delete. */
export function DocActions({
  id,
  parentId,
  archived,
  canEdit,
  canManage,
}: {
  id: string;
  parentId: string | null;
  archived: boolean;
  canEdit: boolean;
  canManage: boolean;
}) {
  const t = useT();
  const d = t.docs;
  const locale = useLocale();
  const router = useRouter();
  const { exec, pending } = useAction();
  const path = localePath(locale, `/panel/docs/${id}`);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      toast.success(d.linkCopied);
    } catch {
      toast.error(d.linkCopyFailed);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      {canEdit && (
        <Button asChild>
          <Link href={localePath(locale, `/panel/docs/${id}/edit`)}>
            <PencilIcon /> {t.common.edit}
          </Link>
        </Button>
      )}
      <Button
        variant="outline"
        size="icon"
        onClick={copyLink}
        aria-label={d.copyLink}
        title={d.copyLink}
      >
        <LinkIcon />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() => window.print()}
        aria-label={d.print}
        title={d.print}
      >
        <PrinterIcon />
      </Button>
      {(canEdit || canManage) && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label={d.more} disabled={pending}>
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {canEdit && (
              <DropdownMenuItem asChild>
                <Link href={localePath(locale, `/panel/docs/new?parentId=${id}`)}>
                  <FilePlus2Icon /> {d.newChild}
                </Link>
              </DropdownMenuItem>
            )}
            {canManage && (
              <>
                <DropdownMenuSeparator />
                {archived ? (
                  <DropdownMenuItem
                    onSelect={() => exec(archiveDocAction({ id, archived: false }), d.restored)}
                  >
                    <ArchiveRestoreIcon /> {d.restore}
                  </DropdownMenuItem>
                ) : (
                  <ConfirmDialog
                    title={d.archiveConfirmTitle}
                    description={d.archiveConfirmBody}
                    confirmLabel={d.archive}
                    onConfirm={() =>
                      exec(
                        archiveDocAction({ id, archived: true }).then((r) => {
                          if (r.ok)
                            router.push(
                              localePath(
                                locale,
                                parentId ? `/panel/docs/${parentId}` : "/panel/docs",
                              ),
                            );
                          return r;
                        }),
                        d.archivedToast,
                      )
                    }
                    trigger={
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <ArchiveIcon /> {d.archive}
                      </DropdownMenuItem>
                    }
                  />
                )}
                <ConfirmDialog
                  description={d.deleteConfirmBody}
                  onConfirm={() =>
                    exec(
                      deleteDocAction({ id }).then((r) => {
                        if (r.ok)
                          router.push(
                            localePath(
                              locale,
                              parentId ? `/panel/docs/${parentId}` : "/panel/docs",
                            ),
                          );
                        return r;
                      }),
                      d.deleted,
                    )
                  }
                  trigger={
                    <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
                      <Trash2Icon /> {t.common.delete}
                    </DropdownMenuItem>
                  }
                />
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
