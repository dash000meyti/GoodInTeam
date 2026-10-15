"use client";

import { useRef, useState } from "react";
import { HandshakeIcon, Loader2Icon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorDot } from "@/components/shared/color-dot";
import { DatePicker } from "@/components/shared/date-picker";
import { SelectField } from "@/components/shared/select-field";
import { useActionForm } from "@/components/shared/use-action-form";
import { addDaysKey } from "@/components/calendar/grid";
import { useT } from "@/i18n/client";
import { createCommitmentAction } from "@/server/modules/calendar/actions";
import { useCalendar } from "./calendar-context";

/** One-line "I just promised…" form: what + to whom + due (promisedAt = now). */
export function CommitmentQuickAdd() {
  const t = useT();
  const c = t.calendar;
  const cal = useCalendar();
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [due, setDue] = useState<string | null>(addDaysKey(cal.todayKey, 1));
  const [whom, setWhom] = useState("");
  const [resetKey, setResetKey] = useState(0);
  const form = useActionForm(createCommitmentAction, {
    successMessage: c.commitmentAdded,
    onSuccess: () => {
      formRef.current?.reset();
      setWhom("");
      setDue(addDaysKey(cal.todayKey, 1));
      setResetKey((k) => k + 1);
      titleRef.current?.focus();
    },
  });
  // Admins promise to clients; members pick the project (its client is used).
  const byClient = cal.isAdmin;
  const whomOptions = byClient
    ? cal.clients.map((x) => ({ value: x.id, label: x.name, icon: <ColorDot color={x.color} /> }))
    : cal.projects.map((x) => ({ value: x.id, label: x.name, icon: <ColorDot color={x.color} /> }));
  const err = form.errors.title?.[0] ?? form.errors.due?.[0] ?? form.errors.clientId?.[0];

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        void form.run(new FormData(e.currentTarget));
      }}
      className="grid gap-3"
      aria-label={c.quickAddTitle}
    >
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <HandshakeIcon className="size-5" />
        </span>
        <div>
          <h2 className="font-bold">{c.quickAddTitle}</h2>
          <p className="text-xs text-muted-foreground">{c.quickAddHint}</p>
        </div>
      </div>
      <input type="hidden" name={byClient ? "clientId" : "projectId"} value={whom} />
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_12rem_11rem_7rem_auto] md:items-end">
        <div className="grid gap-1.5">
          <Label htmlFor="cq-title">{c.what}</Label>
          <Input
            id="cq-title"
            ref={titleRef}
            name="title"
            required
            maxLength={300}
            placeholder={c.whatPlaceholder}
            aria-invalid={!!form.errors.title}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="cq-whom">{c.toWhom}</Label>
          <SelectField
            key={resetKey}
            id="cq-whom"
            value={whom}
            onChange={setWhom}
            noneLabel={byClient ? c.internal : c.noProject}
            placeholder={byClient ? c.noClient : c.noProject}
            options={whomOptions}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="cq-due">{c.due}</Label>
          <DatePicker id="cq-due" name="due" value={due} onChange={setDue} clearable={false} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="cq-time">{c.dueTime}</Label>
          <Input id="cq-time" name="dueTime" type="time" dir="ltr" step={300} />
        </div>
        <Button type="submit" disabled={form.pending} className="h-10">
          {form.pending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
          {c.addCommitment}
        </Button>
      </div>
      {err && (
        <p role="alert" className="text-xs font-medium text-destructive">
          {err}
        </p>
      )}
    </form>
  );
}
