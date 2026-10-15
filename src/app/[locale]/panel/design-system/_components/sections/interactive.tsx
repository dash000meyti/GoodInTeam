import {
  BellRingIcon,
  ChartColumnIcon,
  ChevronLeftIcon,
  FileTextIcon,
  LayersIcon,
  NavigationIcon,
  TextCursorInputIcon,
} from "lucide-react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/shared/markdown";
import { MarkdownEditor } from "@/components/shared/markdown-editor";
import type { Messages } from "@/i18n/messages";
import { LazyAreaChart, LazyBarChart, LazyDonutChart } from "../charts-lazy";
import {
  ChoiceDemo,
  CommandDemo,
  ConfirmDemo,
  DatePickerDemo,
  DialogDemo,
  DropdownDemo,
  PopoverDemo,
  SelectDemo,
  SheetDemo,
  SwitchDemo,
  ToastDemo,
  ToggleDemo,
} from "../demos";
import { Example } from "../example";
import { DsSection } from "../section";

export function FormsSection({ t }: { t: Messages }) {
  const d = t.designSystem;
  return (
    <DsSection
      id="forms"
      title={d.sec_forms}
      description={d.sec_formsDesc}
      icon={TextCursorInputIcon}
      className="lg:grid-cols-2"
    >
      <Example
        title={d.input}
        previewClassName="block"
        code={`const form = useActionForm(createProjectAction, { successMessage: t.common.saved });
// onSubmit (not action): input survives a server validation error
<form onSubmit={form.submit}>
  <Field label={t.projects.name} hint="…" error={form.errors.name?.[0]} required>
    <Input name="name" required />
  </Field>
</form>
// Field → label htmlFor + control id (useId), hint/error → aria-describedby.
// An explicit htmlFor="x" + <Input id="x"> still works.
// Numbers, emails, URLs, code → dir="ltr"`}
      >
        <div className="grid gap-4">
          <Field label={d.f_projectName} hint={d.f_projectNameHint} required>
            <Input placeholder={d.f_projectNamePh} />
          </Field>
          <Field label={d.f_email}>
            <Input type="email" dir="ltr" placeholder="hello@goodteam.ir" />
          </Field>
        </div>
      </Example>
      <Example
        title={d.fieldError}
        previewClassName="block"
        code={`<Field label="Email" error={form.errors.email?.[0]}>
  <Input name="email" />   {/* aria-invalid + aria-describedby come from Field */}
</Field>
// Custom single-value control? spread useFieldControl({ id }) on it.
// A group of buttons/checkboxes that is not one control → <Field label="…" group>`}
      >
        <div className="grid gap-4">
          <Field label={d.f_projectName} error={d.f_required}>
            <Input />
          </Field>
          <Field label={d.f_notes}>
            <Textarea rows={2} placeholder={d.f_notesPh} />
          </Field>
        </div>
      </Example>
      <Example
        title={d.select}
        code={`import { SelectField } from "@/components/shared/select-field";
<Field label={t.common.status}>
  <SelectField
    name="status"               // writes a hidden input (FormData)
    defaultValue="active"
    noneLabel="—"               // optional "none" option → submits ""
    options={statuses.map((s) => ({ value: s, label: t.projects[\`status_\${s}\`] }))}
  />
</Field>`}
      >
        <SelectDemo />
      </Example>
      <Example
        title={`${d.checkbox} · ${d.radio}`}
        code={`<Label><Checkbox name="billable" defaultChecked /> Billable</Label>
<Field label="Billing">         {/* RadioGroup/ToggleGroup → aria-labelledby */}
  <RadioGroup name="billing" defaultValue="hourly">
    <Label><RadioGroupItem value="hourly" /> Hourly</Label>
  </RadioGroup>
</Field>`}
      >
        <ChoiceDemo />
      </Example>
      <Example
        title={d.switch}
        code={`import { SwitchInput } from "@/components/shared/switch-input";
<SwitchInput name="visibleToClient" defaultChecked />  // submits "true"/"false"
// zod: visibleToClient: zBool`}
      >
        <SwitchDemo />
      </Example>
      <Example
        title={d.toggleGroup}
        code={`<ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v)}>
  <ToggleGroupItem value="day">Day</ToggleGroupItem>
  <ToggleGroupItem value="week">Week</ToggleGroupItem>
</ToggleGroup>`}
      >
        <ToggleDemo />
      </Example>
      <Example
        title={d.datePicker}
        description={d.datePickerHint}
        className="lg:col-span-2"
        code={`import { DatePicker } from "@/components/shared/date-picker";
<Field label={t.tasks.dueDate}>   {/* names the trigger button */}
  <DatePicker name="dueDate" defaultValue={toDateInputValue(task.dueAt, tz)} />
</Field>
// server: fromDateInput(input.dueDate, undefined, appTimezone())
// Persian digits for fa; every day button is named with its full date.`}
      >
        <DatePickerDemo />
      </Example>
    </DsSection>
  );
}

export function OverlaysSection({ t }: { t: Messages }) {
  const d = t.designSystem;
  return (
    <DsSection
      id="overlays"
      title={d.sec_overlays}
      description={d.sec_overlaysDesc}
      icon={LayersIcon}
      className="lg:grid-cols-2"
    >
      <Example
        title={d.dialog}
        code={`<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild><Button>…</Button></DialogTrigger>
  <DialogContent>
    <DialogHeader><DialogTitle>…</DialogTitle><DialogDescription>…</DialogDescription></DialogHeader>
    <form onSubmit={form.submit}>… <DialogFooter>…</DialogFooter></form>
  </DialogContent>
</Dialog>`}
      >
        <DialogDemo />
      </Example>
      <Example
        title={d.sheet}
        code={`<Sheet>
  <SheetTrigger asChild><Button>…</Button></SheetTrigger>
  <SheetContent side="end">   {/* "start" | "end" | "top" | "bottom" — logical */}
    <SheetHeader><SheetTitle>…</SheetTitle></SheetHeader>
  </SheetContent>
</Sheet>`}
      >
        <SheetDemo />
      </Example>
      <Example
        title={d.alertDialog}
        code={`import { ConfirmDialog } from "@/components/shared/confirm-button";
<ConfirmDialog
  description={t.projects.deleteHint}
  onConfirm={() => exec(deleteProjectAction({ id }), t.common.saved)}
  trigger={<Button variant="destructive">Delete</Button>}
/>`}
      >
        <ConfirmDemo />
      </Example>
      <Example
        title={`${d.popover} · ${d.tooltip}`}
        code={`<Popover>
  <PopoverTrigger asChild><Button variant="outline">…</Button></PopoverTrigger>
  <PopoverContent>…</PopoverContent>
</Popover>
<Tooltip><TooltipTrigger asChild>…</TooltipTrigger><TooltipContent>…</TooltipContent></Tooltip>`}
      >
        <PopoverDemo />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost">{d.hoverMe}</Button>
          </TooltipTrigger>
          <TooltipContent>{d.tooltipBody}</TooltipContent>
        </Tooltip>
      </Example>
      <Example
        title={d.dropdown}
        code={`<DropdownMenu>
  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon-sm" aria-label="Actions">…</Button></DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem><PencilIcon /> Edit</DropdownMenuItem>
    <DropdownMenuSeparator />
    <ConfirmDialog onConfirm={…} trigger={
      <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>Delete</DropdownMenuItem>
    } />
  </DropdownMenuContent>
</DropdownMenu>`}
      >
        <DropdownDemo />
      </Example>
      <Example
        title={d.command}
        code={`// Global ⌘K palette: entries come from components/panel/nav-config.ts
const { setPaletteOpen } = usePanelUI();
<CommandDialog open={open} onOpenChange={setOpen} title="…">
  <CommandInput placeholder="…" />
  <CommandList><CommandGroup heading="…"><CommandItem onSelect={…}>…</CommandItem></CommandGroup></CommandList>
</CommandDialog>
// Inline <Command> scrolls its first item into view on mount — prefer the dialog.`}
      >
        <CommandDemo />
      </Example>
    </DsSection>
  );
}

export function NavigationSection({ t }: { t: Messages }) {
  const d = t.designSystem;
  return (
    <DsSection
      id="navigation"
      title={d.sec_navigation}
      description={d.sec_navigationDesc}
      icon={NavigationIcon}
      className="lg:grid-cols-2"
    >
      <Example
        title={d.tabs}
        previewClassName="block"
        code={`<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">…</TabsTrigger>
    <TabsTrigger value="milestones">…</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">…</TabsContent>
</Tabs>`}
      >
        <Tabs defaultValue="overview">
          <TabsList>
            {(["overview", "milestones", "updates"] as const).map((k) => (
              <TabsTrigger key={k} value={k}>
                {d[`tab_${k}`]}
              </TabsTrigger>
            ))}
          </TabsList>
          {(["overview", "milestones", "updates"] as const).map((k) => (
            <TabsContent
              key={k}
              value={k}
              className="rounded-xl border border-dashed bg-card p-4 text-sm text-muted-foreground"
            >
              {d[`tab_${k}Body`]}
            </TabsContent>
          ))}
        </Tabs>
      </Example>
      <Example
        title={d.accordion}
        previewClassName="block"
        code={`<Accordion type="single" collapsible>
  <AccordionItem value="a">
    <AccordionTrigger>Question</AccordionTrigger>
    <AccordionContent>Answer</AccordionContent>
  </AccordionItem>
</Accordion>`}
      >
        <Accordion type="single" collapsible defaultValue="q1" className="rounded-xl bg-card px-4">
          <AccordionItem value="q1">
            <AccordionTrigger>{d.faq1q}</AccordionTrigger>
            <AccordionContent>{d.faq1a}</AccordionContent>
          </AccordionItem>
          <AccordionItem value="q2">
            <AccordionTrigger>{d.faq2q}</AccordionTrigger>
            <AccordionContent>{d.faq2a}</AccordionContent>
          </AccordionItem>
        </Accordion>
      </Example>
      <Example
        title={d.breadcrumbs}
        className="lg:col-span-2"
        code={`<PageHeader title={project.name} crumbs={[{ label: t.projects.title, href: href("/panel/projects") }, { label: project.name }]} />
<BackLink href={href("/panel/projects")} label={t.common.back} />  // chevron flips in RTL`}
      >
        <nav
          aria-label="breadcrumb"
          className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
        >
          <a href="#navigation" className="hover:text-foreground hover:underline">
            {d.demoDashboard}
          </a>
          <span className="size-1 rounded-full bg-grey-500" />
          <a href="#navigation" className="hover:text-foreground hover:underline">
            {d.demoPageTitle}
          </a>
          <span className="size-1 rounded-full bg-grey-500" />
          <span className="text-foreground/70">{d.demoProject}</span>
        </nav>
        <Button variant="ghost" size="sm" className="ms-auto text-muted-foreground">
          <ChevronLeftIcon className="rtl:rotate-180" /> {t.common.back}
        </Button>
      </Example>
    </DsSection>
  );
}

export function ChartsSection({ t }: { t: Messages }) {
  const d = t.designSystem;
  return (
    <DsSection
      id="charts"
      title={d.sec_charts}
      description={d.sec_chartsDesc}
      icon={ChartColumnIcon}
      className="lg:grid-cols-2"
    >
      <Example
        title={d.barChart}
        previewClassName="block"
        code={`const config = { hours: { label: t.time.hours, color: "var(--chart-1)" } } satisfies ChartConfig;
<ChartContainer config={config} className="aspect-auto h-56 w-full">
  <BarChart data={rows}>
    <CartesianGrid vertical={false} strokeDasharray="3 3" />
    <XAxis dataKey="day" tickLine={false} axisLine={false} reversed={dir === "rtl"} />
    <ChartTooltip content={<ChartTooltipContent formatter={(v) => formatNumber(+v, locale)} />} />
    <Bar dataKey="hours" fill="var(--color-hours)" radius={[4, 4, 0, 0]} maxBarSize={36} />
  </BarChart>
</ChartContainer>`}
      >
        <LazyBarChart />
      </Example>
      <Example
        title={d.areaChart}
        previewClassName="block"
        code={`// ≥ 2 series → always a legend; one y-axis only (never dual-axis)
<AreaChart data={rows}>
  <ChartTooltip content={<ChartTooltipContent />} />
  <ChartLegend content={<ChartLegendContent />} />
  <Area dataKey="income" stroke="var(--color-income)" strokeWidth={2} fill="url(#fill-income)" />
  <Area dataKey="expense" stroke="var(--color-expense)" strokeWidth={2} fill="url(#fill-expense)" />
</AreaChart>`}
      >
        <LazyAreaChart />
      </Example>
      <Example
        title={d.donutChart}
        className="lg:col-span-2"
        previewClassName="block"
        code={`<PieChart>
  <Pie data={rows} dataKey="value" nameKey="key" innerRadius="62%" outerRadius="92%"
       stroke="var(--card)" strokeWidth={2}>        {/* 2px surface gap between slices */}
    {rows.map((r) => <Cell key={r.key} fill={r.color} />)}
  </Pie>
</PieChart>
// + a value legend beside it — identity is never color-only`}
      >
        <LazyDonutChart />
      </Example>
    </DsSection>
  );
}

export function MarkdownSection({ t }: { t: Messages }) {
  const d = t.designSystem;
  return (
    <DsSection
      id="markdown"
      title={d.sec_markdown}
      description={d.sec_markdownDesc}
      icon={FileTextIcon}
      className="lg:grid-cols-2"
    >
      <Example
        title={d.editor}
        previewClassName="block"
        code={`import { MarkdownEditor } from "@/components/shared/markdown-editor";
<MarkdownEditor name="bodyMd" defaultValue={doc.bodyMd} rows={14} />`}
      >
        <MarkdownEditor defaultValue={d.editorSample} rows={6} />
      </Example>
      <Example
        title={d.rendered}
        previewClassName="block bg-none"
        code={`import { Markdown } from "@/components/shared/markdown";
<Markdown source={update.bodyMd} className="text-[15px]" />`}
      >
        <Markdown source={d.editorSample} className="text-[15px]" />
      </Example>
    </DsSection>
  );
}

export function FeedbackSection({ t }: { t: Messages }) {
  const d = t.designSystem;
  return (
    <DsSection
      id="feedback"
      title={d.sec_feedback}
      description={d.sec_feedbackDesc}
      icon={BellRingIcon}
    >
      <Example
        title={`toast · useActionForm · useAction`}
        code={`import { toast } from "sonner";
toast.success(t.common.saved);
toast.error(res.error.message);
toast.promise(job(), { loading: "…", success: "…", error: "…" });

// Usually implicit:
const form = useActionForm(updateThingAction, { successMessage: t.common.saved });
const { exec, pending } = useAction();
exec(archiveThingAction({ id }), t.common.saved);  // error toast is automatic`}
      >
        <ToastDemo />
      </Example>
    </DsSection>
  );
}
