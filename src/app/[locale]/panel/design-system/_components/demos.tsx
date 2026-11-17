"use client";

import { useState } from "react";
import {
  ArchiveIcon,
  BellRingIcon,
  CalendarDaysIcon,
  CopyIcon,
  FolderKanbanIcon,
  LogOutIcon,
  MonitorIcon,
  MoreHorizontalIcon,
  PanelLeftIcon,
  PanelRightIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
  SlidersHorizontalIcon,
  TimerIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CommandDialog,
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
import { Kbd } from "@/components/ui/kbd";
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
import { PixelMark } from "@/components/brand/pixel-logo";
import { MenuBarShell } from "@/components/shell/menubar-shell";
import { ClockSkeleton, OsClock } from "@/components/shell/os-clock";
import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "@/components/ui/menubar";
import { localeMeta, locales } from "@/i18n/config";
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
      {/* Inside a Field, the radio group is named by the field label (aria-labelledby). */}
      <Field label={d.f_billing}>
        <RadioGroup defaultValue="hourly">
          {(["hourly", "fixed", "retainer"] as const).map((v) => (
            <Label key={v} className="cursor-pointer">
              <RadioGroupItem value={v} /> {d[`f_${v}`]}
            </Label>
          ))}
        </RadioGroup>
      </Field>
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
          <div dir={l === "fa" ? "rtl" : "ltr"}>
            <Field label={l === "fa" ? d.jalali : d.gregorian}>
              <DatePicker value={value} onChange={setValue} />
            </Field>
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

/**
 * Command list in a CommandDialog (cmdk scrolls its selected item into view on
 * mount, so an inline demo would make the page jump) + the real ⌘K palette.
 */
export function CommandDemo() {
  const t = useT();
  const d = t.designSystem;
  const { setPaletteOpen } = usePanelUI();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <SearchIcon /> {d.command}
      </Button>
      <Button variant="soft" onClick={() => setPaletteOpen(true)}>
        {d.openPalette}
        <Kbd dir="ltr" className="bg-background/60">
          ⌘K
        </Kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} title={d.command}>
        <CommandInput placeholder={d.commandPlaceholder} />
        <CommandList>
          <CommandEmpty>{t.common.empty}</CommandEmpty>
          <CommandGroup heading={d.commandGroupNav}>
            <CommandItem onSelect={() => setOpen(false)}>
              <FolderKanbanIcon /> {t.nav.projects}
            </CommandItem>
            <CommandItem onSelect={() => setOpen(false)}>
              <CalendarDaysIcon /> {t.nav.calendar}
            </CommandItem>
            <CommandItem onSelect={() => setOpen(false)}>
              <SettingsIcon /> {t.nav.settings}
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading={d.commandGroupActions}>
            <CommandItem onSelect={() => setOpen(false)}>
              <TimerIcon /> {d.startTimer}
              <CommandShortcut dir="ltr">T</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => setOpen(false)}>
              <PlusIcon /> {d.newProject}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
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

// ─── OS shell ───────────────────────────────────────────────────────────────

/**
 * A static menu bar (MenuBarShell is server-safe; here it gets `relative` so it
 * stays in the flow) with a Radix Menubar: brand, App, a checkbox, a radio
 * group, a submenu and a destructive row — the parts the panel menu bar uses.
 */
export function MenubarDemo() {
  const t = useT();
  const d = t.designSystem;
  const [wide, setWide] = useState(false);
  const [mode, setMode] = useState("system");
  const { dir } = useI18n();
  return (
    <MenuBarShell
      label={d.osShellMenubarDemo}
      // In the flow and opaque: the real menu bar is the page's only blurred bar.
      className="relative top-auto z-0 w-full rounded-lg border bg-background [backdrop-filter:none] [-webkit-backdrop-filter:none]"
      start={
        <Menubar dir={dir} loop>
          <MenubarMenu>
            <MenubarTrigger className="px-1.5" aria-label={t.nav.brandMenu}>
              <PixelMark cell={2} />
            </MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                <MonitorIcon aria-hidden /> {t.panel.desktop}
              </MenubarItem>
              <MenubarItem>
                <SettingsIcon aria-hidden /> {t.common.settings}
              </MenubarItem>
              <MenubarSeparator />
              <MenubarItem variant="destructive">
                <LogOutIcon aria-hidden /> {t.common.signOut}
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger className="font-bold">{t.nav.time}</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                <TimerIcon aria-hidden /> {t.panel.startTimer}
              </MenubarItem>
              <MenubarCheckboxItem checked={wide} onCheckedChange={(v) => setWide(v === true)}>
                {t.panel.zoomWindow}
              </MenubarCheckboxItem>
              <MenubarSeparator />
              <MenubarItem>
                <SearchIcon aria-hidden /> {t.common.commandPalette}
                <MenubarShortcut>⌘K</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
          <MenubarMenu>
            <MenubarTrigger>{t.common.view}</MenubarTrigger>
            <MenubarContent>
              <MenubarLabel>{t.common.appearance}</MenubarLabel>
              <MenubarRadioGroup value={mode} onValueChange={setMode}>
                <MenubarRadioItem value="light">{t.common.light}</MenubarRadioItem>
                <MenubarRadioItem value="dark">{t.common.dark}</MenubarRadioItem>
                <MenubarRadioItem value="system">{t.common.system}</MenubarRadioItem>
              </MenubarRadioGroup>
              <MenubarSeparator />
              <MenubarSub>
                <MenubarSubTrigger>{t.common.language}</MenubarSubTrigger>
                <MenubarSubContent>
                  {locales.map((l) => (
                    <MenubarItem key={l} lang={l}>
                      {localeMeta[l].label}
                    </MenubarItem>
                  ))}
                </MenubarSubContent>
              </MenubarSub>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
      }
      end={
        <>
          <button type="button" className="os-mb-item os-mb-icon" aria-label={t.common.search}>
            <SearchIcon className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            className="os-mb-item os-mb-icon"
            aria-label={t.common.controlCenter}
          >
            <SlidersHorizontalIcon className="size-4" aria-hidden />
          </button>
        </>
      }
    />
  );
}

/** The studio clock (fixed width) above its same-size skeleton, in the current locale. */
export function ClockDemo() {
  const t = useT();
  const { locale } = useI18n();
  return (
    <span className="flex flex-col items-end gap-2 text-[13px] font-medium">
      <OsClock locale={locale} tz="Asia/Tehran" label={t.common.studioTime} />
      <span className="rounded-sm bg-muted">
        <ClockSkeleton />
      </span>
    </span>
  );
}
