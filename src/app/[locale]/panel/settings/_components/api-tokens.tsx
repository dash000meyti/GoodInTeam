"use client";

import { useState } from "react";
import {
  BookOpenTextIcon,
  FileJsonIcon,
  KeyRoundIcon,
  Loader2Icon,
  PencilLineIcon,
  PlusIcon,
  ShieldAlertIcon,
  TrashIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ConfirmDialog } from "@/components/shared/confirm-button";
import { useAction, useActionForm } from "@/components/shared/use-action-form";
import { useT } from "@/i18n/client";
import { format } from "@/i18n/format-message";
import { cn } from "@/lib/utils";
import { createTokenAction, revokeTokenAction } from "@/server/modules/api-tokens/actions";
import { CodeField } from "./code-field";

const expiryPresets = ["7", "30", "90", "365", "0"] as const;

/** "New token" → form → the raw token shown ONCE with ready-to-paste snippets. */
export function CreateTokenDialog({ siteUrl }: { siteUrl: string }) {
  const t = useT();
  const s = t.settings;
  const [open, setOpen] = useState(false);
  const [access, setAccess] = useState<"read" | "write">("read");
  const [expiry, setExpiry] = useState<(typeof expiryPresets)[number]>("90");
  const [token, setToken] = useState<string | null>(null);
  const form = useActionForm(createTokenAction, { onSuccess: (d) => setToken(d.token) });

  const onOpenChange = (o: boolean) => {
    setOpen(o);
    if (!o) {
      setToken(null);
      setAccess("read");
      setExpiry("90");
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon /> {s.newToken}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        {token ? (
          <>
            <DialogHeader>
              <DialogTitle>{s.tokenCreated}</DialogTitle>
              <DialogDescription className="flex items-start gap-2 rounded-xl bg-warning/12 p-3 text-start text-[#7a4100] dark:text-warning">
                <ShieldAlertIcon className="mt-0.5 size-4 shrink-0" />
                {s.tokenOnce}
              </DialogDescription>
            </DialogHeader>
            <div className="min-w-0 space-y-4">
              <CodeField value={token} emphasis multiline />
              <CodeField
                label={s.tokenSnippetClaude}
                multiline
                value={`claude mcp add --transport http good-team ${siteUrl}/api/mcp --header "Authorization: Bearer ${token}"`}
              />
              <CodeField
                label={s.tokenSnippetCurl}
                multiline
                value={`curl -s -X POST ${siteUrl}/api/v1/tools/whoami \\\n  -H "Authorization: Bearer ${token}" \\\n  -H "content-type: application/json" -d '{}'`}
              />
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href="/api/v1/openapi.json" target="_blank" rel="noopener">
                    <FileJsonIcon /> {s.openapiDocs}
                  </a>
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>{s.done}</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{s.newToken}</DialogTitle>
              <DialogDescription>{s.myTokensHint}</DialogDescription>
            </DialogHeader>
            <form className="grid gap-5" action={form.submit}>
              <input
                type="hidden"
                name="scopes"
                value={access === "write" ? "read,write" : "read"}
              />
              <input type="hidden" name="expiresInDays" value={expiry} />
              <Field
                label={s.tokenName}
                error={form.errors.name?.[0]}
                required
                htmlFor="token-name"
              >
                <Input
                  id="token-name"
                  name="name"
                  placeholder={s.tokenNamePlaceholder}
                  maxLength={100}
                  required
                  autoFocus
                />
              </Field>
              <Field label={s.access}>
                <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
                  {(["read", "write"] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      role="radio"
                      aria-checked={access === a}
                      onClick={() => setAccess(a)}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-start transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
                        access === a ? "border-primary bg-primary/6" : "hover:bg-accent",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-lg",
                          a === "read"
                            ? "bg-info/12 text-info"
                            : "bg-warning/16 text-[#b76e00] dark:text-warning",
                        )}
                      >
                        {a === "read" ? (
                          <BookOpenTextIcon className="size-4" />
                        ) : (
                          <PencilLineIcon className="size-4" />
                        )}
                      </span>
                      <span className="space-y-0.5">
                        <span className="block text-sm font-bold">{s[`access_${a}`]}</span>
                        <span className="block text-xs text-muted-foreground">
                          {s[`access_${a}Hint`]}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </Field>
              <Field label={s.expiry}>
                <ToggleGroup
                  type="single"
                  value={expiry}
                  onValueChange={(v) => v && setExpiry(v as (typeof expiryPresets)[number])}
                  className="flex w-full flex-wrap"
                >
                  {expiryPresets.map((d) => (
                    <ToggleGroupItem key={d} value={d} className="flex-1">
                      {s[`expiry_${d}`]}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </Field>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  {t.common.cancel}
                </Button>
                <Button type="submit" disabled={form.pending}>
                  {form.pending ? <Loader2Icon className="animate-spin" /> : <KeyRoundIcon />}
                  {s.createToken}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function RevokeTokenButton({ id, name }: { id: string; name: string }) {
  const t = useT();
  const s = t.settings;
  const { exec, pending } = useAction();
  return (
    <ConfirmDialog
      title={format(s.revokeTokenTitle, { name })}
      description={s.revokeTokenBody}
      confirmLabel={s.revokeToken}
      onConfirm={() => exec(revokeTokenAction({ id }), s.tokenRevoked)}
      trigger={
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={pending}
          aria-label={s.revokeToken}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <TrashIcon />
        </Button>
      }
    />
  );
}
