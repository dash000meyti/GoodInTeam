"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2Icon,
  ExternalLinkIcon,
  MailIcon,
  PhoneIcon,
  Trash2Icon,
  UserPlusIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/shared/confirm-button";
import { SelectField } from "@/components/shared/select-field";
import { useAction } from "@/components/shared/use-action-form";
import { localePath } from "@/i18n/config";
import { useLocale, useT } from "@/i18n/client";
import { cn, initials } from "@/lib/utils";
import {
  convertLeadAction,
  deleteLeadAction,
  updateLeadStatusAction,
} from "@/server/modules/leads/actions";

export const leadStatuses = ["new", "contacted", "qualified", "won", "lost", "spam"] as const;
export type LeadStatus = (typeof leadStatuses)[number];

export const leadVariant: Record<
  LeadStatus,
  "info" | "warning" | "violet" | "success" | "neutral" | "destructive"
> = {
  new: "info",
  contacted: "warning",
  qualified: "violet",
  won: "success",
  lost: "neutral",
  spam: "destructive",
};

export interface LeadRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  service: string | null;
  serviceLabel: string | null;
  budget: string | null;
  budgetLabel: string | null;
  message: string;
  locale: string;
  source: string | null;
  status: LeadStatus;
  clientId: string | null;
  received: string;
  receivedFull: string;
}

export function LeadsBoard({ rows }: { rows: LeadRow[] }) {
  const t = useT();
  const c = t.content;
  const locale = useLocale();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = rows.find((r) => r.id === openId) ?? null;
  const { exec, pending } = useAction();

  return (
    <>
      <Card className="divide-y divide-dashed divide-border py-0">
        {rows.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setOpenId(r.id)}
            className="flex w-full cursor-pointer items-start gap-4 px-5 py-4 text-start transition-colors hover:bg-muted/50"
          >
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                r.status === "new"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {initials(r.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "truncate",
                    r.status === "new" ? "font-extrabold" : "font-semibold",
                  )}
                  dir="auto"
                >
                  {r.name}
                </span>
                {r.company && (
                  <span className="truncate text-xs text-muted-foreground" dir="auto">
                    · {r.company}
                  </span>
                )}
                <Badge variant={leadVariant[r.status]} className="ms-auto">
                  {c[`leadStatus_${r.status}`]}
                </Badge>
              </span>
              <span
                className="mt-1 line-clamp-2 block text-sm leading-6 text-muted-foreground"
                dir="auto"
              >
                {r.message}
              </span>
              <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{r.received}</span>
                {r.serviceLabel && <span>· {r.serviceLabel}</span>}
                {r.budgetLabel && <span>· {r.budgetLabel}</span>}
                <span className="uppercase">· {r.locale}</span>
              </span>
            </span>
          </button>
        ))}
      </Card>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent side="end" className="w-full overflow-y-auto sm:max-w-lg">
          {open && (
            <>
              <SheetHeader className="border-b border-dashed pb-5">
                <SheetTitle className="text-xl" dir="auto">
                  {open.name}
                </SheetTitle>
                <SheetDescription>
                  {c.received}: {open.receivedFull}
                </SheetDescription>
              </SheetHeader>
              <div className="space-y-6 p-6 pt-2">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground">{c.colStatus}</p>
                  <SelectField
                    value={open.status}
                    onChange={(s) =>
                      exec(
                        updateLeadStatusAction({ id: open.id, status: s as LeadStatus }),
                        t.common.saved,
                      )
                    }
                    options={leadStatuses.map((s) => ({ value: s, label: c[`leadStatus_${s}`] }))}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-muted-foreground">{c.leadMessage}</p>
                  <p
                    className="rounded-xl bg-muted/60 p-4 text-sm leading-7 whitespace-pre-wrap"
                    dir="auto"
                  >
                    {open.message}
                  </p>
                </div>
                <div className="space-y-2.5 text-sm">
                  <p className="text-xs font-bold text-muted-foreground">{c.leadContact}</p>
                  <a
                    href={`mailto:${open.email}`}
                    className="flex items-center gap-2 hover:text-primary"
                    dir="ltr"
                  >
                    <MailIcon className="size-4 text-muted-foreground" /> {open.email}
                  </a>
                  {open.phone && (
                    <a
                      href={`tel:${open.phone}`}
                      className="flex items-center gap-2 hover:text-primary"
                      dir="ltr"
                    >
                      <PhoneIcon className="size-4 text-muted-foreground" /> {open.phone}
                    </a>
                  )}
                  {open.company && (
                    <p className="flex items-center gap-2" dir="auto">
                      <Building2Icon className="size-4 text-muted-foreground" /> {open.company}
                    </p>
                  )}
                </div>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    [c.leadService, open.serviceLabel ?? open.service ?? "—"],
                    [c.leadBudget, open.budgetLabel ?? open.budget ?? "—"],
                    [c.leadSource, open.source ?? "—"],
                    [c.leadLocale, open.locale],
                  ].map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-dashed p-3">
                      <dt className="text-xs text-muted-foreground">{k}</dt>
                      <dd className="mt-1 font-semibold break-words">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="flex flex-wrap gap-2 border-t border-dashed pt-5">
                  <Button asChild variant="inherit">
                    <a href={`mailto:${open.email}`}>
                      <MailIcon /> {c.replyByEmail}
                    </a>
                  </Button>
                  {open.clientId ? (
                    <Button asChild variant="soft">
                      <Link href={localePath(locale, `/panel/clients/${open.clientId}`)}>
                        <ExternalLinkIcon /> {c.openClient}
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      variant="soft"
                      disabled={pending}
                      onClick={() =>
                        exec(
                          convertLeadAction({ id: open.id }).then((res) => {
                            if (res.ok) toast.success(c.converted);
                            return res;
                          }),
                        )
                      }
                    >
                      <UserPlusIcon /> {c.convertToClient}
                    </Button>
                  )}
                  <ConfirmDialog
                    onConfirm={() => {
                      exec(deleteLeadAction({ id: open.id }), t.common.delete);
                      setOpenId(null);
                    }}
                    trigger={
                      <Button
                        variant="ghost"
                        className="ms-auto text-destructive hover:text-destructive"
                      >
                        <Trash2Icon /> {c.deleteLead}
                      </Button>
                    }
                  />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
