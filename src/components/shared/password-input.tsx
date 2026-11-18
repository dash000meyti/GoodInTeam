"use client";

import { useState, type ComponentProps, type ReactNode } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/**
 * The app's password / secret input with a show–hide toggle (login, setup,
 * account security). Inside a `<Field>` it is wired like any `Input`.
 *
 * The whole field is an LTR island: `dir="ltr"` sits on the wrapper, not on
 * the `<input>` alone. Secrets are Latin text, and the reserved padding
 * (`pe-*`) and the toggle (`end-*`) must resolve against the same direction.
 * With `dir="ltr"` only on the input, a Persian page put the toggle at the
 * page's inline end (left) and the padding at the input's (right), so the
 * typed text ran under the eye icon.
 *
 * The toggle keeps one accessible name and reports its state with
 * `aria-pressed`. `adornment` adds buttons next to it (e.g. a generator).
 */
export function PasswordInput({
  adornment,
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, "type" | "dir"> & { adornment?: ReactNode }) {
  const t = useT();
  const [shown, setShown] = useState(false);
  return (
    <div dir="ltr" className="relative">
      <Input
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        {...props}
        type={shown ? "text" : "password"}
        className={cn(adornment ? "pe-[4.5rem]" : "pe-10", className)}
      />
      <div className="absolute inset-y-0 end-1 flex items-center gap-0.5">
        {adornment}
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          onClick={() => setShown((s) => !s)}
          aria-label={t.common.showPassword}
          aria-pressed={shown}
        >
          {shown ? <EyeOffIcon /> : <EyeIcon />}
        </Button>
      </div>
    </div>
  );
}
