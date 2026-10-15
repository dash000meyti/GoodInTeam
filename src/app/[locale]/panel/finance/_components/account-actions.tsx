"use client";

import { useRouter } from "next/navigation";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react";
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
import { archiveAccountAction, deleteAccountAction } from "@/server/modules/finance/actions";
import { AccountFormDialog, type AccountFormValues } from "./account-form";

export function AccountActions({
  account,
  archived,
  defaultCurrency,
  redirectOnDelete,
  withEditButton,
}: {
  account: AccountFormValues;
  archived: boolean;
  defaultCurrency: string;
  redirectOnDelete?: boolean;
  withEditButton?: boolean;
}) {
  const t = useT();
  const f = t.finance;
  const locale = useLocale();
  const router = useRouter();
  const { exec, pending } = useAction();
  const edit = (
    <AccountFormDialog
      account={account}
      defaultCurrency={defaultCurrency}
      trigger={
        withEditButton ? (
          <Button variant="outline">
            <PencilIcon /> {t.common.edit}
          </Button>
        ) : (
          <Button variant="ghost" size="icon-sm" aria-label={t.common.edit}>
            <PencilIcon />
          </Button>
        )
      }
    />
  );
  return (
    <div className="flex items-center gap-1">
      {edit}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={withEditButton ? "outline" : "ghost"}
            size={withEditButton ? "icon" : "icon-sm"}
            aria-label={t.common.actions}
            disabled={pending}
          >
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() =>
              exec(archiveAccountAction({ id: account.id, archived: !archived }), t.common.saved)
            }
          >
            {archived ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
            {archived ? f.unarchive : f.archive}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <ConfirmDialog
            description={f.deleteAccountHint}
            onConfirm={() =>
              exec(
                deleteAccountAction({ id: account.id }).then((r) => {
                  if (r.ok && redirectOnDelete)
                    router.push(localePath(locale, "/panel/finance/accounts"));
                  return r;
                }),
                t.common.saved,
              )
            }
            trigger={
              <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
                <Trash2Icon /> {t.common.delete}
              </DropdownMenuItem>
            }
          />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
