"use client";

import { Link2Icon, Link2OffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/shared/copy-button";
import { useAction } from "@/components/shared/use-action-form";
import { useT } from "@/i18n/client";
import { shareProjectAction } from "@/server/modules/projects/actions";

export function ShareLinkCard({ projectId, url }: { projectId: string; url: string | null }) {
  const t = useT();
  const { exec, pending } = useAction();
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{t.projects.publicLinkHint}</p>
      {url ? (
        <div className="flex gap-2">
          <Input
            readOnly
            value={url}
            dir="ltr"
            className="font-mono text-xs"
            onFocus={(e) => e.currentTarget.select()}
          />
          <CopyButton value={url} size="icon-sm" />
          <Button
            variant="outline"
            size="icon-sm"
            disabled={pending}
            onClick={() => exec(shareProjectAction({ id: projectId, enabled: false }))}
            aria-label={t.projects.disableLink}
          >
            <Link2OffIcon className="text-destructive" />
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => exec(shareProjectAction({ id: projectId, enabled: true }))}
        >
          <Link2Icon /> {t.projects.enableLink}
        </Button>
      )}
    </div>
  );
}
