"use client";

import { Loader2Icon, SparklesIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-button";
import { useAction } from "@/components/shared/use-action-form";
import { useT } from "@/i18n/client";
import { deleteContractAction, installStartersAction } from "@/server/modules/contracts/actions";

export function DeleteTemplateButton({ id }: { id: string }) {
  const t = useT();
  const { exec, pending } = useAction();
  return (
    <ConfirmDialog
      description={t.contracts.deleteTemplateHint}
      onConfirm={() => exec(deleteContractAction({ id }), t.contracts.deleted)}
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t.common.delete}
          title={t.common.delete}
          disabled={pending}
        >
          <Trash2Icon className="text-destructive" />
        </Button>
      }
    />
  );
}

export function InstallStartersButton({ keys }: { keys?: string[] }) {
  const t = useT();
  const { exec, pending } = useAction();
  return (
    <Button
      variant="soft"
      disabled={pending}
      onClick={() => exec(installStartersAction({ keys }), t.contracts.startersAdded)}
    >
      {pending ? <Loader2Icon className="animate-spin" /> : <SparklesIcon />}
      {t.contracts.addStarters}
    </Button>
  );
}
