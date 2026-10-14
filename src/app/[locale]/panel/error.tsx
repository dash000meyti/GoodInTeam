"use client";

import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/panel/empty-state";
import { useT } from "@/i18n/client";

export default function PanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();
  return (
    <EmptyState
      icon={TriangleAlertIcon}
      title={t.common.errorTitle}
      description={
        <>
          {t.common.errorBody}
          {error.digest && <code className="mt-2 block text-xs opacity-60">{error.digest}</code>}
        </>
      }
      action={
        <Button variant="outline" onClick={reset}>
          <RotateCcwIcon /> {t.common.retry}
        </Button>
      }
    />
  );
}
