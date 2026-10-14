import {
  AlertTriangleIcon,
  CheckIcon,
  ChevronLeftIcon,
  ClockIcon,
  ExternalLinkIcon,
  Loader2Icon,
  MousePointerClickIcon,
  PlayIcon,
  PlusIcon,
  SettingsIcon,
  SparklesIcon,
  TagIcon,
  Trash2Icon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Messages } from "@/i18n/messages";
import { Example } from "../example";
import { DsSection } from "../section";

const buttonVariants = [
  "default",
  "inherit",
  "soft",
  "outline",
  "secondary",
  "ghost",
  "link",
  "destructive",
] as const;
const buttonSizes = ["sm", "default", "lg"] as const;
const badgeVariants = [
  "default",
  "solid",
  "neutral",
  "success",
  "warning",
  "info",
  "violet",
  "destructive",
  "outline",
] as const;

export function ButtonsSection({ t }: { t: Messages }) {
  const d = t.designSystem;
  return (
    <DsSection
      id="buttons"
      title={d.sec_buttons}
      description={d.sec_buttonsDesc}
      icon={MousePointerClickIcon}
      className="lg:grid-cols-2"
    >
      <Example
        title={d.variants}
        className="lg:col-span-2"
        code={`import { Button } from "@/components/ui/button";
<Button>Primary</Button>                 // one per area
<Button variant="inherit">…</Button>     // high-contrast neutral
<Button variant="soft">…</Button>
<Button variant="outline">…</Button>
<Button variant="ghost">…</Button>
<Button variant="destructive">…</Button> // inside ConfirmDialog flows`}
      >
        {buttonVariants.map((v) => (
          <Button key={v} variant={v}>
            {v}
          </Button>
        ))}
      </Example>
      <Example
        title={d.sizes}
        code={`<Button size="sm">…</Button>
<Button>…</Button>
<Button size="lg">…</Button>`}
      >
        {buttonSizes.map((s) => (
          <Button key={s} size={s}>
            {d.saveLabel} · {s}
          </Button>
        ))}
      </Example>
      <Example
        title={d.withIcon}
        code={`<Button><PlusIcon /> New project</Button>
<Button variant="soft"><PlayIcon /> Start timer</Button>
// Directional icons flip in RTL:
<ChevronLeftIcon className="rtl:rotate-180" />`}
      >
        <Button>
          <PlusIcon /> {d.newProject}
        </Button>
        <Button variant="soft">
          <PlayIcon /> {d.startTimer}
        </Button>
        <Button variant="ghost">
          {d.viewAll} <ChevronLeftIcon className="ltr:rotate-180" />
        </Button>
      </Example>
      <Example
        title={d.loading}
        code={`<Button type="submit" disabled={form.pending}>
  {form.pending && <Loader2Icon className="animate-spin" />}
  {t.common.save}
</Button>`}
      >
        <Button disabled>
          <Loader2Icon className="animate-spin" /> {d.savingLabel}
        </Button>
        <Button variant="outline" disabled>
          <Loader2Icon className="animate-spin" /> {d.savingLabel}
        </Button>
      </Example>
      <Example
        title={d.iconOnly}
        code={`<Tooltip>
  <TooltipTrigger asChild>
    <Button variant="ghost" size="icon" aria-label="Settings"><SettingsIcon /></Button>
  </TooltipTrigger>
  <TooltipContent>Settings</TooltipContent>
</Tooltip>
// sizes: icon-sm (32) · icon (36) · icon-lg (44) — always set aria-label`}
      >
        {(["icon-sm", "icon", "icon-lg"] as const).map((s) => (
          <Tooltip key={s}>
            <TooltipTrigger asChild>
              <Button variant="outline" size={s} aria-label={t.common.settings}>
                <SettingsIcon />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{s}</TooltipContent>
          </Tooltip>
        ))}
        <Button
          variant="ghost"
          size="icon"
          aria-label={t.common.delete}
          className="text-destructive"
        >
          <Trash2Icon />
        </Button>
      </Example>
      <Example
        title={d.asLink}
        className="lg:col-span-2"
        code={`<Button asChild variant="outline">
  <Link href={href("/panel/projects")}>…</Link>
</Button>`}
      >
        <Button asChild variant="outline">
          <a href="#buttons">
            <ExternalLinkIcon /> {d.viewAll}
          </a>
        </Button>
        <Button asChild variant="link">
          <a href="#buttons">{d.viewAll}</a>
        </Button>
      </Example>
    </DsSection>
  );
}

export function BadgesSection({ t }: { t: Messages }) {
  const d = t.designSystem;
  return (
    <DsSection
      id="badges"
      title={d.sec_badges}
      description={d.sec_badgesDesc}
      icon={TagIcon}
      className="lg:grid-cols-2"
    >
      <Example
        title={d.variants}
        code={`import { Badge } from "@/components/ui/badge";
<Badge>default</Badge>
<Badge variant="success">…</Badge>   // soft by default
<Badge variant="solid">…</Badge>`}
      >
        {badgeVariants.map((v) => (
          <Badge key={v} variant={v}>
            {v}
          </Badge>
        ))}
      </Example>
      <Example
        title={d.statusExamples}
        code={`<Badge variant="success"><CheckIcon /> Active</Badge>
<Badge variant="warning"><ClockIcon /> Pending</Badge>
<Badge variant="destructive"><AlertTriangleIcon /> Overdue</Badge>
// Status color is never the only signal — keep the label (and an icon).`}
      >
        <Badge variant="success">
          <CheckIcon /> {d.st_active}
        </Badge>
        <Badge variant="warning">
          <ClockIcon /> {d.st_pending}
        </Badge>
        <Badge variant="destructive">
          <AlertTriangleIcon /> {d.st_overdue}
        </Badge>
        <Badge variant="neutral">{d.st_draft}</Badge>
        <Badge variant="info">
          <SparklesIcon /> {d.st_new}
        </Badge>
        <Badge variant="violet">{d.st_planning}</Badge>
        <Badge variant="solid">{d.st_paid}</Badge>
      </Example>
    </DsSection>
  );
}
