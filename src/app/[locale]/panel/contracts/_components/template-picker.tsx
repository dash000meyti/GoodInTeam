"use client";

import { useState, type ReactNode } from "react";
import { FileTextIcon, Loader2Icon, SparklesIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

export interface PickableTemplate {
  /** Saved template id … */
  id?: string;
  /** … or built-in starter key. */
  starter?: string;
  title: string;
  kind: "contract" | "proposal" | "nda" | "approval" | "change_request";
  locale: "fa" | "en";
  summary?: string;
}

/** Dialog listing saved templates (or the built-in starters when there are none). */
export function TemplatePicker({
  trigger,
  templates,
  starters,
  onPick,
}: {
  trigger: ReactNode;
  templates: PickableTemplate[];
  starters: PickableTemplate[];
  onPick: (tpl: PickableTemplate) => Promise<boolean>;
}) {
  const t = useT();
  const c = t.contracts;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const pick = async (tpl: PickableTemplate) => {
    const key = tpl.id ?? tpl.starter ?? "";
    setBusy(key);
    const ok = await onPick(tpl);
    setBusy(null);
    if (ok) setOpen(false);
  };

  const item = (tpl: PickableTemplate, starter: boolean) => {
    const key = tpl.id ?? tpl.starter ?? "";
    return (
      <li key={key}>
        <button
          type="button"
          disabled={!!busy}
          onClick={() => pick(tpl)}
          dir={tpl.locale === "fa" ? "rtl" : "ltr"}
          className={cn(
            "flex w-full cursor-pointer items-start gap-3 rounded-xl border border-dashed p-4 text-start transition-colors hover:border-primary hover:bg-primary/5 disabled:cursor-wait disabled:opacity-60",
          )}
        >
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/12 text-primary">
            {busy === key ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : starter ? (
              <SparklesIcon className="size-4" />
            ) : (
              <FileTextIcon className="size-4" />
            )}
          </span>
          <span className="min-w-0 flex-1 space-y-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{tpl.title}</span>
              <Badge variant="outline">{c[`kind_${tpl.kind}`]}</Badge>
              <Badge variant="neutral">{tpl.locale.toUpperCase()}</Badge>
            </span>
            {tpl.summary && (
              <span className="block text-xs text-muted-foreground">{tpl.summary}</span>
            )}
          </span>
        </button>
      </li>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{c.chooseTemplate}</DialogTitle>
          <DialogDescription>{c.chooseTemplateHint}</DialogDescription>
        </DialogHeader>
        {templates.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase">{c.myTemplates}</h3>
            <ul className="space-y-2">{templates.map((tpl) => item(tpl, false))}</ul>
          </section>
        )}
        {templates.length === 0 && (
          <section className="space-y-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase">{c.startersTitle}</h3>
            <ul className="space-y-2">{starters.map((tpl) => item(tpl, true))}</ul>
          </section>
        )}
      </DialogContent>
    </Dialog>
  );
}
