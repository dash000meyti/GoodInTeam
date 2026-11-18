import {
  CheckSquareIcon,
  ClockIcon,
  LayoutTemplateIcon,
  MoreHorizontalIcon,
  PlusIcon,
  TrendingUpIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { StatCard, StatGrid } from "@/components/panel/stat-card";
import { ColorDot } from "@/components/shared/color-dot";
import type { Messages } from "@/i18n/messages";
import { formatNumber, formatPercent } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import type { Locale } from "@/i18n/config";
import { Example } from "../example";
import { DsSection } from "../section";

export function SurfacesSection({ t, locale }: { t: Messages; locale: Locale }) {
  const d = t.designSystem;
  return (
    <DsSection
      id="surfaces"
      title={d.sec_surfaces}
      description={d.sec_surfacesDesc}
      icon={LayoutTemplateIcon}
      className="lg:grid-cols-2"
    >
      <Example
        title={d.pageHeader}
        description={d.pageHeaderHint}
        className="lg:col-span-2"
        previewClassName="block"
        code={`import { PageHeader } from "@/components/panel/page-header";
import { StatCard, StatRow } from "@/components/panel/stat-card";
// The page's first box: strip GOOD-IN-TEAM/PANEL/<route> (or path={["INVOICES", inv.number]}),
// crumbs, h1, description, actions; a dots decor cell with <MODULE>.APP from lg.
<PageHeader
  title={t.projects.title}
  description={t.projects.subtitle}
  crumbs={[{ label: t.nav.dashboard, href: href("/panel") }, { label: t.projects.title }]}
  actions={<Button><PlusIcon /> {t.projects.new}</Button>}
>
  <StatRow>{/* optional: more rows of the same box */}<StatCard … /></StatRow>
</PageHeader>`}
      >
        <PageHeader
          className="mb-0 lg:mb-0"
          title={d.demoPageTitle}
          description={d.demoPageDesc}
          crumbs={[{ label: d.demoDashboard, href: "#surfaces" }, { label: d.demoPageTitle }]}
          path={["PROJECTS"]}
          app="PROJECTS"
          icon="projects"
          actions={
            <Button>
              <PlusIcon /> {d.newProject}
            </Button>
          }
        />
      </Example>

      <Example
        title={d.statCard}
        description={d.statCardHint}
        className="lg:col-span-2"
        previewClassName="block"
        code={`import { StatCard, StatGrid } from "@/components/panel/stat-card";
<StatGrid>  {/* its own box; columns follow the count, the last row gets dots fillers */}
  <StatCard label="Hours this week" value="32.5" hint="+12%" icon={ClockIcon} tone="info" />
  <StatCard … />
</StatGrid>
// tone: primary | info | warning | violet | destructive | success (the icon's ink)
// Inside an existing box (PageHeader children, a Card): <StatRow>…</StatRow>`}
      >
        <StatGrid>
          <StatCard
            label={d.demoHours}
            value={formatNumber(32.5, locale)}
            hint={d.demoHoursHint}
            icon={ClockIcon}
            tone="info"
          />
          <StatCard
            label={d.demoIncome}
            value={formatMoney(184_000_000, "IRT", locale, { compact: true })}
            icon={TrendingUpIcon}
            tone="success"
          />
          <StatCard
            label={d.demoTasks}
            value={formatNumber(12, locale)}
            icon={CheckSquareIcon}
            tone="violet"
          />
        </StatGrid>
      </Example>

      <Example
        title={d.card}
        description={d.cardHint}
        previewClassName="block"
        code={`<Card>  {/* a compact .frame-box */}
  <CardHeader>  {/* first: flush header row, hairline below */}
    <CardTitle>…</CardTitle>
    <CardDescription>…</CardDescription>
    <CardAction><Button variant="ghost" size="icon-sm">…</Button></CardAction>
  </CardHeader>
  <CardContent>…</CardContent>
  <CardFooter className="border-t">…</CardFooter>
</Card>
// A table edge to edge: <Card className="gap-0 py-0"><CardHeader/><Table/></Card>`}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ColorDot color="#078DEE" /> {d.demoProject}
            </CardTitle>
            <CardDescription>{d.demoClient}</CardDescription>
            <CardAction>
              <Button variant="ghost" size="icon-sm" aria-label={t.common.actions}>
                <MoreHorizontalIcon />
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{d.demoProjectDesc}</p>
            <div className="flex items-center gap-3">
              <Progress value={68} className="flex-1" />
              <span className="text-xs font-bold tabular-nums">{formatPercent(68, locale)}</span>
            </div>
          </CardContent>
          <CardFooter className="justify-between border-t">
            <Badge variant="success">{d.st_active}</Badge>
            <Button variant="soft" size="sm">
              {d.viewAll}
            </Button>
          </CardFooter>
        </Card>
      </Example>

      <Example
        title={d.emptyState}
        previewClassName="block"
        code={`import { EmptyState } from "@/components/panel/empty-state";
// Framed on its own; inside a Card or a FrameCell it drops its frame.
<EmptyState
  icon={CheckSquareIcon}
  title={t.tasks.empty}
  description={t.tasks.emptyHint}
  action={<Button><PlusIcon /> {t.tasks.new}</Button>}
/>`}
      >
        <EmptyState
          icon={CheckSquareIcon}
          title={d.demoEmptyTitle}
          description={d.demoEmptyDesc}
          className="py-10"
          action={
            <Button size="sm">
              <PlusIcon /> {d.demoNewTask}
            </Button>
          }
        />
      </Example>
    </DsSection>
  );
}
