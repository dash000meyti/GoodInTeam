"use client";

import { useRouter } from "next/navigation";
import { CopyPlusIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAction } from "@/components/shared/use-action-form";
import { localePath } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import { duplicateContractAction } from "@/server/modules/contracts/actions";

/** "Create a new version": copies a (signed) document into a new draft and opens its editor. */
export function DuplicateButton({ id, asNewVersion }: { id: string; asNewVersion?: boolean }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const { exec, pending } = useAction();
  return (
    <Button
      disabled={pending}
      onClick={() =>
        exec(
          duplicateContractAction({ id, asNewVersion }).then((r) => {
            if (r.ok) router.push(localePath(locale, `/panel/contracts/${r.data.id}/edit`));
            return r;
          }),
          t.contracts.duplicated,
        )
      }
    >
      {pending ? <Loader2Icon className="animate-spin" /> : <CopyPlusIcon />}
      {asNewVersion ? t.contracts.duplicateAsNewVersion : t.contracts.duplicate}
    </Button>
  );
}
