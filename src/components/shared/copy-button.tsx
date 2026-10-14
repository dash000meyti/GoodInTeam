"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";

export function CopyButton({
  value,
  label,
  size = "sm",
}: {
  value: string;
  label?: string;
  size?: "sm" | "icon-sm";
}) {
  const [done, setDone] = useState(false);
  const t = useT();
  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? <CheckIcon className="text-success" /> : <CopyIcon />}
      {size !== "icon-sm" && (done ? t.common.copied : (label ?? t.common.copy))}
    </Button>
  );
}
