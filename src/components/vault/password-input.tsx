"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/**
 * Secret input with a show/hide toggle. Always LTR (secrets are Latin text),
 * never spell-checked or auto-capitalised. `adornment` adds extra buttons
 * (e.g. the generator) next to the toggle.
 */
export function PasswordInput({
  value,
  onChange,
  adornment,
  className,
  invalid,
  ...props
}: Omit<ComponentProps<"input">, "type" | "value" | "onChange"> & {
  value: string;
  onChange: (value: string) => void;
  adornment?: ReactNode;
  invalid?: boolean;
}) {
  const t = useT();
  const [shown, setShown] = useState(false);
  return (
    <div dir="ltr" className="relative">
      <Input
        {...props}
        type={shown ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-invalid={invalid || undefined}
        className={cn("font-mono", adornment ? "pe-[4.5rem]" : "pe-10", className)}
      />
      <div className="absolute inset-y-0 end-1 flex items-center gap-0.5">
        {adornment}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          onClick={() => setShown((s) => !s)}
          aria-label={shown ? t.vault.hide : t.vault.reveal}
          aria-pressed={shown}
        >
          {shown ? <EyeOffIcon /> : <EyeIcon />}
        </Button>
      </div>
    </div>
  );
}
