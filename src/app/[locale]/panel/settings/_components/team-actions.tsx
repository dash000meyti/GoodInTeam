"use client";

import { useState } from "react";
import {
  BanIcon,
  CircleCheckIcon,
  KeyRoundIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  ShieldIcon,
  Trash2Icon,
  UserPlusIcon,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/shared/copy-button";
import { SelectField } from "@/components/shared/select-field";
import { useAction, useActionForm } from "@/components/shared/use-action-form";
import { useT } from "@/i18n/client";
import { format } from "@/i18n/format-message";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/server/db/schema/auth";
import {
  deleteUserAction,
  inviteTeamUserAction,
  resetUserPasswordAction,
  setUserDisabledAction,
  setUserRoleAction,
} from "@/server/modules/users/actions";

/** Email + one-time password box with copy. */
function TempPassword({ email, password }: { email: string; password: string }) {
  return (
    <div className="space-y-3">
      <div
        className="rounded-xl border border-primary/30 bg-primary/6 p-4 font-mono text-sm"
        dir="ltr"
      >
        <div className="text-muted-foreground">{email}</div>
        <div className="mt-1 text-base font-bold tracking-wide select-all">{password}</div>
      </div>
      <CopyButton value={`${email}\n${password}`} />
    </div>
  );
}

/** "Invite member" → creates a staff account and shows its temporary password once. */
export function InviteMemberDialog() {
  const t = useT();
  const s = t.settings;
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<"member" | "admin">("member");
  const [result, setResult] = useState<{ email: string; tempPassword: string } | null>(null);
  const form = useActionForm(inviteTeamUserAction, { onSuccess: (d) => setResult(d) });
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setResult(null);
          setRole("member");
        }
        form.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlusIcon /> {s.invite}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{s.inviteTitle}</DialogTitle>
          <DialogDescription>{result ? s.inviteDone : s.inviteHint}</DialogDescription>
        </DialogHeader>
        {result ? (
          <>
            <TempPassword email={result.email} password={result.tempPassword} />
            <DialogFooter>
              <Button onClick={() => setOpen(false)}>{s.done}</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={form.submit} className="grid gap-4">
            <input type="hidden" name="role" value={role} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={t.common.name}
                error={form.errors.name?.[0]}
                required
                htmlFor="inv-name"
              >
                <Input id="inv-name" name="name" required autoFocus />
              </Field>
              <Field
                label={t.common.email}
                error={form.errors.email?.[0]}
                required
                htmlFor="inv-email"
              >
                <Input id="inv-email" name="email" type="email" dir="ltr" required />
              </Field>
              <Field label={s.jobTitle} htmlFor="inv-title">
                <Input id="inv-title" name="title" placeholder={s.jobTitlePlaceholder} />
              </Field>
              <Field label={t.common.language}>
                <SelectField
                  name="locale"
                  defaultValue="fa"
                  options={[
                    { value: "fa", label: s.lang_fa },
                    { value: "en", label: s.lang_en },
                  ]}
                />
              </Field>
            </div>
            <Field label={s.role} group>
              <div role="radiogroup" className="grid gap-3 sm:grid-cols-2">
                {(["member", "admin"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={role === r}
                    onClick={() => setRole(r)}
                    className={cn(
                      "flex cursor-pointer flex-col gap-1 rounded-xl border p-3 text-start transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40",
                      role === r ? "border-primary bg-primary/6" : "hover:bg-accent",
                    )}
                  >
                    <span className="text-sm font-bold">{t.panel[`role_${r}`]}</span>
                    <span className="text-xs text-muted-foreground">{s[`roleHint_${r}`]}</span>
                  </button>
                ))}
              </div>
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t.common.cancel}
              </Button>
              <Button type="submit" disabled={form.pending}>
                {form.pending ? <Loader2Icon className="animate-spin" /> : <UserPlusIcon />}
                {s.invite}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Row menu: role, temporary password, disable/enable, delete. */
export function UserActions({
  user,
  actorIsOwner,
}: {
  user: { id: string; name: string; role: UserRole; disabled: boolean };
  actorIsOwner: boolean;
}) {
  const t = useT();
  const s = t.settings;
  const { exec, pending } = useAction();
  const [temp, setTemp] = useState<{ email: string; tempPassword: string } | null>(null);
  // Confirmations are controlled dialogs *outside* the menu, so the menu
  // closes normally and nothing stays modal after the action.
  const [confirm, setConfirm] = useState<"reset" | "disable" | "delete" | null>(null);
  const staff = user.role !== "client";
  const roles = (actorIsOwner ? ["owner", "admin", "member"] : ["admin", "member"]) as UserRole[];

  const confirmations = {
    reset: {
      title: format(s.resetPasswordTitle, { name: user.name }),
      body: s.resetPasswordBody,
      label: s.resetPassword,
      run: () =>
        exec(
          resetUserPasswordAction({ id: user.id }).then((r) => {
            if (r.ok) setTemp(r.data);
            return r;
          }),
        ),
    },
    disable: {
      title: format(s.disableTitle, { name: user.name }),
      body: s.disableBody,
      label: s.disableUser,
      run: () => exec(setUserDisabledAction({ id: user.id, disabled: true }), s.userDisabled),
    },
    delete: {
      title: format(s.deleteUserTitle, { name: user.name }),
      body: s.deleteUserBody,
      label: s.deleteUser,
      run: () => exec(deleteUserAction({ id: user.id }), s.userDeleted),
    },
  } as const;
  const current = confirm ? confirmations[confirm] : null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={t.common.actions} disabled={pending}>
            {pending ? <Loader2Icon className="animate-spin" /> : <MoreHorizontalIcon />}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56"
          onCloseAutoFocus={(e) => {
            if (confirm) e.preventDefault();
          }}
        >
          <DropdownMenuLabel className="truncate">{user.name}</DropdownMenuLabel>
          {staff && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <ShieldIcon className="size-4 text-muted-foreground" /> {s.changeRole}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuRadioGroup
                  value={user.role}
                  onValueChange={(role) =>
                    role !== user.role &&
                    exec(
                      setUserRoleAction({
                        id: user.id,
                        role: role as "owner" | "admin" | "member",
                      }),
                      s.roleChanged,
                    )
                  }
                >
                  {roles.map((r) => (
                    <DropdownMenuRadioItem key={r} value={r}>
                      {t.panel[`role_${r}`]}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          <DropdownMenuItem onSelect={() => setConfirm("reset")}>
            <KeyRoundIcon /> {s.resetPassword}
          </DropdownMenuItem>
          {user.disabled ? (
            <DropdownMenuItem
              onSelect={() =>
                exec(setUserDisabledAction({ id: user.id, disabled: false }), s.userEnabled)
              }
            >
              <CircleCheckIcon /> {s.enableUser}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => setConfirm("disable")}>
              <BanIcon /> {s.disableUser}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setConfirm("delete")}>
            <Trash2Icon /> {s.deleteUser}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={!!current} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{current?.title}</AlertDialogTitle>
            <AlertDialogDescription>{current?.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              className={confirm === "reset" ? buttonVariants() : undefined}
              onClick={() => current?.run()}
            >
              {current?.label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!temp} onOpenChange={(o) => !o && setTemp(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{s.resetPassword}</DialogTitle>
            <DialogDescription>{s.resetPasswordDone}</DialogDescription>
          </DialogHeader>
          {temp && <TempPassword email={temp.email} password={temp.tempPassword} />}
          <DialogFooter>
            <Button onClick={() => setTemp(null)}>{s.done}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
