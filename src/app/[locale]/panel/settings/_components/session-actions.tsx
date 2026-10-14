"use client";

import { LogOutIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/confirm-button";
import { useAction } from "@/components/shared/use-action-form";
import { useT } from "@/i18n/client";
import { format } from "@/i18n/format-message";
import { revokeOtherSessionsAction, revokeSessionAction } from "@/server/modules/auth/actions";

/** End one of my other sessions (with confirmation). */
export function RevokeSessionButton({ id }: { id: string }) {
  const t = useT();
  const s = t.settings;
  const { exec, pending } = useAction();
  return (
    <ConfirmDialog
      title={s.endSessionTitle}
      description={s.endSessionBody}
      confirmLabel={s.endSession}
      onConfirm={() => exec(revokeSessionAction({ id }), s.sessionEnded)}
      trigger={
        <Button variant="outline" size="sm" disabled={pending}>
          <LogOutIcon className="rtl:-scale-x-100" />
          {s.endSession}
        </Button>
      }
    />
  );
}

/** Sign out of every session except this browser. */
export function SignOutOthersButton({ disabled }: { disabled?: boolean }) {
  const t = useT();
  const s = t.settings;
  const { exec, pending } = useAction();
  return (
    <ConfirmDialog
      title={s.signOutOthersTitle}
      description={s.signOutOthersBody}
      confirmLabel={s.signOutOthers}
      onConfirm={() =>
        exec(
          revokeOtherSessionsAction({}).then((r) => {
            if (r.ok) toast.success(format(s.signedOutOthers, { n: r.data.revoked }));
            return r;
          }),
        )
      }
      trigger={
        <Button variant="soft" size="sm" disabled={disabled || pending}>
          <LogOutIcon className="rtl:-scale-x-100" />
          {s.signOutOthers}
        </Button>
      }
    />
  );
}
