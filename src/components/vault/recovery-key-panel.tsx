"use client";

import { useId } from "react";
import { CopyIcon, DownloadIcon, KeySquareIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useT } from "@/i18n/client";
import { useVaultCopy } from "./clipboard";
import { downloadText } from "./formats";

/**
 * Shows a freshly generated recovery key ONCE with copy / download (.txt) and
 * the required "I saved it" confirmation.
 */
export function RecoveryKeyPanel({
  recoveryKey,
  account,
  saved,
  onSavedChange,
}: {
  recoveryKey: string;
  account: string;
  saved: boolean;
  onSavedChange: (saved: boolean) => void;
}) {
  const t = useT();
  const v = t.vault;
  const id = useId();
  const copy = useVaultCopy();
  const groups = recoveryKey.split("-");

  const download = () => {
    const date = new Date().toISOString().slice(0, 10);
    downloadText(
      `good-team-vault-recovery-key-${date}.txt`,
      [
        v.recoveryFileHeader,
        "=".repeat(48),
        "",
        recoveryKey,
        "",
        `${v.recoveryFileAccount}: ${account}`,
        `${v.recoveryFileCreated}: ${date}`,
        "",
        v.recoveryFileNote,
        "",
      ].join("\n"),
    );
  };

  return (
    <div className="grid gap-5">
      <div className="flex items-start gap-3 rounded-xl bg-warning/12 p-4 text-sm text-[#7a4100] dark:text-[#ffd666]">
        <KeySquareIcon className="mt-0.5 size-5 shrink-0" />
        <p className="leading-7">{v.recoveryBody}</p>
      </div>
      <div
        dir="ltr"
        className="grid grid-cols-3 gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 sm:grid-cols-4 md:grid-cols-5"
        data-testid="recovery-key"
        aria-label={v.recoveryKey}
      >
        {groups.map((g, i) => (
          <code
            key={i}
            className="rounded-lg bg-background px-2 py-1.5 text-center font-mono text-sm font-bold tracking-widest shadow-card select-all dark:bg-card"
          >
            {g}
          </code>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => copy.secret(recoveryKey)}>
          <CopyIcon /> {t.common.copy}
        </Button>
        <Button type="button" variant="outline" onClick={download}>
          <DownloadIcon /> {v.downloadTxt}
        </Button>
      </div>
      <label
        htmlFor={id}
        className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 text-sm font-semibold has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
      >
        <Checkbox
          id={id}
          checked={saved}
          onCheckedChange={(c) => onSavedChange(c === true)}
          className="mt-0.5"
        />
        {v.savedIt}
      </label>
    </div>
  );
}
