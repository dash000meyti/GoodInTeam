"use client";

import { useState } from "react";
import {
  ArchiveIcon,
  BellRingIcon,
  CalendarDaysIcon,
  CopyIcon,
  FolderKanbanIcon,
  MoreHorizontalIcon,
  PanelLeftIcon,
  PanelRightIcon,
  PencilIcon,
  PlusIcon,
  SettingsIcon,
  SlidersHorizontalIcon,
  TimerIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
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
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ConfirmDialog } from "@/components/shared/confirm-button";
import { DatePicker } from "@/components/shared/date-picker";
import { SelectField } from "@/components/shared/select-field";
import { SwitchInput } from "@/components/shared/switch-input";
import { usePanelUI } from "@/components/panel/panel-ui";
import { I18nProvider, useI18n, useT } from "@/i18n/client";

// ─── Forms ──────────────────────────────────────────────────────────────────

export function SelectDemo() {
  const d = useT().designSystem;
  return (
    <Field label={d.f_status} className="w-full max-w-xs">
      <SelectField
        name="status"
        defaultValue="active"
        noneLabel="—"
        options={[
          { value: "active", label: d.st_active },
          { value: "planning", label: d.st_planning },
          { value: "pending", label: d.st_pending },
        ]}
      />
    </Field>
  );
}

export function ChoiceDemo() {
  const d = useT().designSystem;
  return (
    <div className="grid w-full gap-5 sm:grid-cols-2">
      <div className="space-y-3">
        <Label className="cursor-pointer">
          <Checkbox defaultChecked /> {d.f_billable}
        </Label>
        <Label className="cursor-pointer">
          <Checkbox /> {d.f_visible}
        </Label>
      </div>
      <RadioGroup defaultValue="hourly" aria-label={d.f_billing}>
        {(["hourly", "fixed", "retainer"] as const).map((v) => (
          <Label key={v} className="cursor-pointer">
            <RadioGroupItem value={v} /> {d[`f_${v}`]}
          </Label>
        ))}
      </RadioGroup>
    </div>
  );
}

export function SwitchDemo() {
  const d = useT().designSystem;
  return (
    <div className="space-y-3">
      <Label className="cursor-pointer">
        <SwitchInput name="visibleToClient" defaultChecked /> {d.f_visible}
      </Label>
      <Label className="cursor-pointer">
        <Switch disabled /> {d.f_billable}
      </Label>
    </div>
  );
}

export function ToggleDemo() {
  const d = useT().designSystem;
  const [v, setV] = useState("week");
  return (
    <ToggleGroup type="single" value={v} onValueChange={(x) => x && setV(x)}>
      <ToggleGroupItem value="day">{d.f_day}</ToggleGroupItem>
      <ToggleGroupItem value="week">{d.f_week}</ToggleGroupItem>
      <ToggleGroupItem value="month">{d.f_month}</ToggleGroupItem>
    </ToggleGroup>
  );
}

/** Both calendars side by side (nested I18nProvider overrides the locale). */
export function DatePickerDemo() {
  const { messages } = useI18n();
  const d = useT().designSystem;
  const [value, setValue] = useState<string | null>("2026-03-21");
  return (
    <div className="grid w-full gap-4 sm:grid-cols-2">
      {(["fa", "en"] as const).map((l) => (
        <I18nProvider key={l} locale={l} messages={messages}>
          <div dir={l === "fa" ? "rtl" : "ltr"} className="space-y-2">
            <Label>{l === "fa" ? d.jalali : d.gregorian}</Label>
            <DatePicker value={value} onChange={setValue} />
          </div>
        </I18nProvider>
      ))}
      <p className="font-mono text-xs text-muted-foreground sm:col-span-2" dir="ltr">
        value = {JSON.stringify(value)}
      </p>
    </div>
  );
}

// ─── Overlays ───────────────────────────────────────────────────────────────

export function DialogDemo() {
  const t = useT();
  const d = t.designSystem;
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <PencilIcon /> {d.openDialog}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{d.dialogTitle}</DialogTitle>
          <DialogDescription>{d.dialogBody}</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setOpen(false);
            toast.success(d.toastSuccessMsg);
          }}
        >
          <Field label={d.f_projectName} hint={d.f_projectNameHint}>
            <Input defaultValue={d.demoProject} autoFocus />
          </Field>
          <Field label={d.f_dueDate}>
            <DatePicker />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t.common.cancel}
            </Button>
            <Button type="submit">{t.common.save}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SheetDemo() {
  const d = useT().designSystem;
  return (
    <>
      {(["start", "end"] as const).map((side) => (
        <Sheet key={side}>
          <SheetTrigger asChild>
            <Button variant="outline">
              {side === "start" ? (
                <PanelRightIcon className="ltr:-scale-x-100" />
              ) : (
                <PanelLeftIcon className="ltr:-scale-x-100" />
              )}
              {side === "start" ? d.sheetStart : d.sheetEnd}
            </Button>
          </SheetTrigger>
          <SheetContent side={side}>
            <SheetHeader>
              <SheetTitle>{d.sheetTitle}</SheetTitle>
              <SheetDescription>{d.sheetBody}</SheetDescription>
            </SheetHeader>
            <div className="space-y-3 px-4">
              {[72, 48, 88].map((w) => (
                <div key={w} className="h-3 rounded-full bg-muted" style={{ width: `${w}%` }} />
              ))}
            </div>
          </SheetContent>
        </Sheet>
      ))}
    </>
  );
}

export function ConfirmDemo() {
  const t = useT();
  const d = t.designSystem;
  return (
    <ConfirmDialog
      onConfirm={() => toast.success(t.common.deleteConfirmTitle)}
      trigger={
        <Button variant="destructive">
          <Trash2Icon /> {d.deleteProject}
        </Button>
      }
    />
  );
}

export function PopoverDemo() {
  const d = useT().designSystem;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <SlidersHorizontalIcon /> {d.popover}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{d.popoverBody}</p>
        <ToggleDemo />
      </PopoverContent>
    </Popover>
  );
}

export function DropdownDemo() {
  const t = useT();
  const d = t.designSystem;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <MoreHorizontalIcon /> {d.actions}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-52">
        <DropdownMenuLabel>{d.demoProject}</DropdownMenuLabel>
        <DropdownMenuItem>
          <PencilIcon /> {t.common.edit}
          <DropdownMenuShortcut dir="ltr">⌘E</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <CopyIcon /> {d.duplicate}
        </DropdownMenuItem>
        <DropdownMenuItem>
          <ArchiveIcon /> {d.archive}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">
          <Trash2Icon /> {t.common.delete}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Inline Command list + a button that opens the real ⌘K palette. */
export function CommandDemo() {
  const t = useT();
  const d = t.designSystem;
  const { setPaletteOpen } = usePanelUI();
  return (
    <div className="grid w-full gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
      <Command className="rounded-xl border shadow-card">
        <CommandInput placeholder={d.commandPlaceholder} />
        <CommandList className="max-h-56">
          <CommandEmpty>{t.common.empty}</CommandEmpty>
          <CommandGroup heading={d.commandGroupNav}>
            <CommandItem>
              <FolderKanbanIcon /> {t.nav.projects}
            </CommandItem>
            <CommandItem>
              <CalendarDaysIcon /> {t.nav.calendar}
            </CommandItem>
            <CommandItem>
              <SettingsIcon /> {t.nav.settings}
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading={d.commandGroupActions}>
            <CommandItem>
              <TimerIcon /> {d.startTimer}
              <CommandShortcut dir="ltr">T</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <PlusIcon /> {d.newProject}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
      <Button variant="soft" onClick={() => setPaletteOpen(true)}>
        {d.openPalette}
      </Button>
    </div>
  );
}

// ─── Feedback ───────────────────────────────────────────────────────────────

export function ToastDemo() {
  const d = useT().designSystem;
  return (
    <>
      <Button variant="soft" onClick={() => toast.success(d.toastSuccessMsg)}>
        {d.toastSuccess}
      </Button>
      <Button variant="outline" onClick={() => toast.error(d.toastErrorMsg)}>
        {d.toastError}
      </Button>
      <Button variant="outline" onClick={() => toast.info(d.toastInfoMsg)}>
        <BellRingIcon /> {d.toastInfo}
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.promise(new Promise((r) => setTimeout(r, 1600)), {
            loading: d.toastLoadingMsg,
            success: d.toastDoneMsg,
            error: d.toastErrorMsg,
          })
        }
      >
        {d.toastPromise}
      </Button>
    </>
  );
}
