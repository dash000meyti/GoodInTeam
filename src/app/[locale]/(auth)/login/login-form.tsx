"use client";

import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { EyeIcon, EyeOffIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/client";
import { login } from "@/server/modules/auth/actions";

export function LoginForm() {
  const t = useT();
  const next = useSearchParams().get("next") ?? undefined;
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);

  return (
    <form
      className="grid gap-5"
      // onSubmit (not action=): React resets forms after an action, which would clear the email.
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          setError(null);
          const res = await login({
            email: String(fd.get("email") ?? ""),
            password: String(fd.get("password") ?? ""),
            next,
          });
          if (res && !res.ok) setError(res.error.message);
        });
      }}
    >
      <Field label={t.auth.email} htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          dir="ltr"
          required
          autoFocus
        />
      </Field>
      <Field label={t.auth.password} htmlFor="password">
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            dir="ltr"
            required
            className="pe-10"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute inset-y-0 end-0 flex w-10 cursor-pointer items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label={show ? t.auth.hidePassword : t.auth.showPassword}
          >
            {show ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
          </button>
        </div>
      </Field>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
        >
          {error}
        </p>
      )}
      <Button type="submit" size="lg" variant="inherit" disabled={pending}>
        {pending && <Loader2Icon className="animate-spin" />}
        {t.auth.submit}
      </Button>
    </form>
  );
}
