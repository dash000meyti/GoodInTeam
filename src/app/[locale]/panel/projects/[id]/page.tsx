import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarIcon,
  ClockIcon,
  ExternalLinkIcon,
  GitBranchIcon,
  GlobeIcon,
  MegaphoneIcon,
  WalletIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColorDot } from "@/components/shared/color-dot";
import { Markdown } from "@/components/shared/markdown";
import { EmptyState } from "@/components/panel/empty-state";
import { PageHeader } from "@/components/panel/page-header";
import { STAT_VALUE_CLASS, StatCard, StatRow } from "@/components/panel/stat-card";
import { FrameBox, FrameCell, FrameGrid, HEADING_CLASS } from "@/components/shell/frame";
import { daysUntil } from "@/lib/due";
import { env } from "@/lib/env";
import { formatDate, formatDateTime, formatHours, formatNumber, formatPercent } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { toDateInputValue } from "@/lib/tz";
import { isAdmin, isStaff } from "@/server/auth/actor";
import { AppError } from "@/server/errors";
import { clientOptions } from "@/server/modules/clients/service";
import { getProject } from "@/server/modules/projects/service";
import { canAccessContracts } from "@/server/modules/contracts/service";
import { panelContext } from "@/server/page-context";
import { ProjectEventsPanel } from "../../calendar/_components/project-events-panel";
import { ProjectContractsPanel } from "../../contracts/_components/project-contracts-panel";
import { ProjectDocsPanel } from "../../docs/_components/project-docs-panel";
import { ProjectFinancePanel } from "../../finance/_components/project-finance-panel";
import { ProjectTasksPanel } from "../../tasks/_components/project-tasks-panel";
import { ProjectTimePanel } from "../../time/_components/project-time-panel";
import { KeyValueRow, SectionCell } from "../_components/frame-parts";
import { MilestonesPanel } from "../_components/milestones-panel";
import { ProjectActions } from "../_components/project-actions";
import type { ProjectFormValues } from "../_components/project-form";
import { ProjectStatusBadge } from "../_components/project-status-badge";
import { ShareLinkCard } from "../_components/share-link-card";
import { UpdateComposer } from "../_components/update-composer";
import { kindLabels } from "../_components/update-kinds";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Strip path segment: only Latin slugs (the pixel font has no Persian glyphs). */
const LATIN_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

/**
 * Project detail (framed): the page box carries the project's stats and the
 * tab strip as its last rows; each tab's content follows as framed boxes
 * (the module panels of other tabs render their own boxes).
 */
export default async function ProjectPage({
  params,
  searchParams,
}: PageProps<"/[locale]/panel/projects/[id]">) {
  const { id } = await params;
  const ctx = await panelContext();
  const { actor, t, fmt, href, locale, tz } = ctx;
  const data = await getProject(actor, id).catch((e) => {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  });
  const { project, milestones, updates, stats } = data;
  const p = t.projects;
  const admin = isAdmin(actor);
  const staff = isStaff(actor);
  const isClient = !staff;
  // The service nulls `progress` (and empties milestones) when it isn't shared with a client.
  const progress = project.progress;
  const showProgress = progress != null;
  // Tabs per role: staff see every module; clients only what the project shares.
  const tabs = {
    overview: true,
    milestones: showProgress,
    updates: true,
    tasks: staff || project.shareTasks,
    time: staff || project.shareTime,
    calendar: true,
    contracts: canAccessContracts(actor),
    finance: admin || (isClient && project.shareFinance),
    docs: staff || project.shareDocs,
    portal: admin,
  } satisfies Record<string, boolean>;
  type Tab = keyof typeof tabs;
  const requested = first((await searchParams).tab);
  const activeTab: Tab =
    requested && requested in tabs && tabs[requested as Tab] ? (requested as Tab) : "overview";
  // Calendar days in the app timezone: 0 = due today (not overdue until the day ends).
  const daysLeft = project.dueDate ? daysUntil(project.dueDate, ctx.now, tz) : null;
  const dueHint =
    daysLeft == null
      ? undefined
      : daysLeft > 0
        ? `${formatNumber(daysLeft, locale)} ${p.daysLeft}`
        : daysLeft === 0
          ? p.dueTodayHint
          : p.overdueBy.replace("{n}", formatNumber(-daysLeft, locale));

  const formValues: ProjectFormValues = {
    id: project.id,
    name: project.name,
    clientId: project.clientId,
    description: project.description,
    status: project.status,
    color: project.color,
    startDate: project.startDate ? toDateInputValue(project.startDate, tz) : null,
    dueDate: project.dueDate ? toDateInputValue(project.dueDate, tz) : null,
    billingType: project.billingType,
    currency: project.currency,
    budgetMinor: project.budgetMinor,
    hourlyRateMinor: project.hourlyRateMinor,
    estimateHours: project.estimateHours,
    progress: progress ?? 0,
    progressMode: project.progressMode,
    websiteUrl: project.websiteUrl,
    repoUrl: project.repoUrl,
    portalEnabled: project.portalEnabled,
    shareProgress: project.shareProgress,
    shareTime: project.shareTime,
    shareTasks: project.shareTasks,
    shareFinance: project.shareFinance,
    shareDocs: project.shareDocs,
  };

  const statCells = [
    progress != null && (
      <FrameCell key="progress" className="flex flex-col gap-2">
        <p className="pt-1.5 text-sm leading-5 font-semibold text-muted-foreground">{p.progress}</p>
        <p className={STAT_VALUE_CLASS}>{formatPercent(progress, locale)}</p>
        <Progress value={progress} className="mt-1" />
      </FrameCell>
    ),
    stats.trackedMs != null && (
      <StatCard
        key="time"
        label={p.timeSpent}
        value={`${formatHours(stats.trackedMs, locale)} ${t.common.hours}`}
        hint={
          project.estimateHours
            ? `/ ${formatNumber(project.estimateHours, locale)} ${t.common.hours}`
            : undefined
        }
        icon={ClockIcon}
        tone="info"
      />
    ),
    project.dueDate && (
      <StatCard
        key="due"
        label={p.dueDate}
        value={formatDate(project.dueDate, fmt)}
        hint={dueHint}
        icon={CalendarIcon}
        tone={daysLeft != null && daysLeft < 0 ? "destructive" : "warning"}
      />
    ),
    admin && project.budgetMinor != null && (
      <StatCard
        key="budget"
        label={p.budget}
        value={formatMoney(project.budgetMinor, project.currency, locale, { compact: true })}
        hint={p[`billing_${project.billingType}`]}
        icon={WalletIcon}
        tone="success"
      />
    ),
  ].filter(Boolean);

  return (
    <Tabs defaultValue={activeTab} className="gap-0">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <ColorDot color={project.color} className="size-3.5 rounded-none" />
            <span className="min-w-0">{project.name}</span>
            <ProjectStatusBadge status={project.status} t={p} />
          </span>
        }
        crumbs={[{ label: p.title, href: href("/panel/projects") }, { label: project.name }]}
        description={project.client?.name}
        path={["PROJECTS", ...(LATIN_SLUG.test(project.slug) ? [project.slug] : [])]}
        actions={
          admin && (
            <ProjectActions
              project={formValues}
              clients={clientOptions(actor)}
              archived={!!project.archivedAt}
            />
          )
        }
      >
        {statCells.length > 0 && <StatRow>{statCells}</StatRow>}
        {/* The framed tab strip: the box's last row, chips like the site's filter row. */}
        <FrameGrid cols={1}>
          <FrameCell className="py-3">
            <TabsList className="-mx-1 max-w-[calc(100%+0.5rem)] scrollbar-thin justify-start overflow-x-auto px-1 py-0.5">
              <TabsTrigger value="overview" className="flex-none">
                {p.overview}
              </TabsTrigger>
              {tabs.milestones && (
                <TabsTrigger value="milestones" className="flex-none">
                  {p.milestones}
                </TabsTrigger>
              )}
              <TabsTrigger value="updates" className="flex-none">
                {p.updates}
              </TabsTrigger>
              {tabs.tasks && (
                <TabsTrigger value="tasks" className="flex-none">
                  {p.tabTasks}
                </TabsTrigger>
              )}
              {tabs.time && (
                <TabsTrigger value="time" className="flex-none">
                  {p.tabTime}
                </TabsTrigger>
              )}
              <TabsTrigger value="calendar" className="flex-none">
                {p.tabCalendar}
              </TabsTrigger>
              {tabs.contracts && (
                <TabsTrigger value="contracts" className="flex-none">
                  {p.tabContracts}
                </TabsTrigger>
              )}
              {tabs.finance && (
                <TabsTrigger value="finance" className="flex-none">
                  {p.tabFinance}
                </TabsTrigger>
              )}
              {tabs.docs && (
                <TabsTrigger value="docs" className="flex-none">
                  {p.tabDocs}
                </TabsTrigger>
              )}
              {tabs.portal && (
                <TabsTrigger value="portal" className="flex-none">
                  {p.portal}
                </TabsTrigger>
              )}
            </TabsList>
          </FrameCell>
        </FrameGrid>
      </PageHeader>

      <TabsContent value="overview">
        <FrameBox as="div" density="compact">
          <FrameGrid cols="2-1">
            <SectionCell title={t.common.description} titleId="pj-description">
              {project.description ? (
                <Markdown source={project.description} />
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </SectionCell>
            <SectionCell title={t.common.details} titleId="pj-details">
              <dl>
                <KeyValueRow label={p.client}>{project.client?.name ?? p.noClient}</KeyValueRow>
                <KeyValueRow label={p.startDate}>{formatDate(project.startDate, fmt)}</KeyValueRow>
                {staff && (
                  <KeyValueRow label={p.billingType}>
                    {p[`billing_${project.billingType}`]}
                  </KeyValueRow>
                )}
                {admin && project.hourlyRateMinor != null && (
                  <KeyValueRow label={p.hourlyRate}>
                    {formatMoney(project.hourlyRateMinor, project.currency, locale)}
                  </KeyValueRow>
                )}
                {admin &&
                  stats.money.map((m) => (
                    <KeyValueRow
                      key={m.kind + m.currency}
                      label={
                        m.kind === "income"
                          ? t.panel.monthIncome.split(" ")[0]!
                          : t.panel.monthExpense.split(" ")[0]!
                      }
                    >
                      {formatMoney(m.total, m.currency, locale)}
                    </KeyValueRow>
                  ))}
              </dl>
              {(project.websiteUrl || (staff && project.repoUrl)) && (
                <div className="mt-4 space-y-2 border-t border-frame-line pt-4 text-sm">
                  {project.websiteUrl && (
                    <a
                      href={project.websiteUrl}
                      target="_blank"
                      rel="noopener"
                      className="flex items-center gap-2 font-semibold text-primary-ink hover:underline"
                    >
                      <GlobeIcon className="size-4" /> {p.websiteUrl}{" "}
                      <ExternalLinkIcon className="size-3" />
                    </a>
                  )}
                  {staff && project.repoUrl && (
                    <a
                      href={project.repoUrl}
                      target="_blank"
                      rel="noopener"
                      className="flex items-center gap-2 font-semibold text-primary-ink hover:underline"
                    >
                      <GitBranchIcon className="size-4" /> {p.repoUrl}{" "}
                      <ExternalLinkIcon className="size-3" />
                    </a>
                  )}
                </div>
              )}
            </SectionCell>
          </FrameGrid>
        </FrameBox>
      </TabsContent>

      {showProgress && (
        <TabsContent value="milestones">
          <FrameBox as="div" density="compact">
            <FrameGrid cols={1}>
              <SectionCell
                title={p.milestones}
                titleId="pj-milestones"
                description={`${p.progressMode}: ${p[`progress_${project.progressMode}`]}`}
                flush
              >
                <MilestonesPanel
                  projectId={project.id}
                  editable={admin}
                  items={milestones.map((m) => ({
                    id: m.id,
                    title: m.title,
                    status: m.status,
                    weight: m.weight,
                    visibleToClient: m.visibleToClient,
                    dueLabel: m.dueDate ? formatDate(m.dueDate, fmt) : null,
                  }))}
                />
              </SectionCell>
            </FrameGrid>
          </FrameBox>
        </TabsContent>
      )}

      <TabsContent value="updates">
        {updates.length === 0 && !staff ? (
          <EmptyState icon={MegaphoneIcon} title={t.common.empty} />
        ) : (
          <FrameBox as="section" density="compact" ariaLabel={p.updates}>
            {staff && (
              <FrameGrid cols={1}>
                <FrameCell className="py-3">
                  <UpdateComposer projectId={project.id} locale={locale} />
                </FrameCell>
              </FrameGrid>
            )}
            {updates.length === 0 ? (
              <FrameGrid cols={1}>
                <FrameCell>
                  <EmptyState icon={MegaphoneIcon} title={t.common.empty} className="py-8" />
                </FrameCell>
              </FrameGrid>
            ) : (
              <FrameGrid cols={1}>
                {updates.map((u) => (
                  <FrameCell key={u.id} as="article" className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          u.kind === "release"
                            ? "success"
                            : u.kind === "issue"
                              ? "destructive"
                              : u.kind === "request"
                                ? "warning"
                                : "info"
                        }
                      >
                        {kindLabels[locale][u.kind]}
                      </Badge>
                      <h3 className={HEADING_CLASS.box}>{u.title}</h3>
                      {staff && !u.visibleToClient && (
                        <Badge variant="neutral">{t.common.draft}</Badge>
                      )}
                      <span className="ms-auto text-xs text-muted-foreground">
                        {u.author?.name} · {formatDateTime(u.createdAt, fmt)}
                      </span>
                    </div>
                    {u.bodyMd && <Markdown source={u.bodyMd} />}
                  </FrameCell>
                ))}
              </FrameGrid>
            )}
          </FrameBox>
        )}
      </TabsContent>

      {tabs.tasks && (
        <TabsContent value="tasks">
          <ProjectTasksPanel projectId={project.id} ctx={ctx} clientView={isClient} />
        </TabsContent>
      )}

      {tabs.time && (
        <TabsContent value="time">
          <ProjectTimePanel projectId={project.id} ctx={ctx} clientView={isClient} />
        </TabsContent>
      )}

      <TabsContent value="calendar">
        <ProjectEventsPanel projectId={project.id} ctx={ctx} clientView={isClient} />
      </TabsContent>

      {tabs.contracts && (
        <TabsContent value="contracts">
          <ProjectContractsPanel projectId={project.id} ctx={ctx} clientView={isClient} />
        </TabsContent>
      )}

      {tabs.finance && (
        <TabsContent value="finance">
          <ProjectFinancePanel projectId={project.id} ctx={ctx} clientView={isClient} />
        </TabsContent>
      )}

      {tabs.docs && (
        <TabsContent value="docs">
          <ProjectDocsPanel projectId={project.id} ctx={ctx} clientView={isClient} />
        </TabsContent>
      )}

      {tabs.portal && (
        <TabsContent value="portal">
          <FrameBox as="div" density="compact">
            <FrameGrid cols={2}>
              <SectionCell title={p.portal} titleId="pj-portal" description={p.portalHint} flush>
                <ul className="divide-y divide-dashed divide-frame-line text-sm">
                  {(
                    [
                      "portalEnabled",
                      "shareProgress",
                      "shareTime",
                      "shareTasks",
                      "shareFinance",
                      "shareDocs",
                    ] as const
                  ).map((k) => (
                    <li
                      key={k}
                      className="flex items-center justify-between gap-3 px-(--cell-pad) py-2.5"
                    >
                      <span>{p[k]}</span>
                      <Badge variant={project[k] ? "success" : "neutral"}>
                        {project[k] ? t.common.yes : t.common.no}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </SectionCell>
              <SectionCell title={p.publicLink} titleId="pj-public-link">
                <ShareLinkCard
                  projectId={project.id}
                  url={
                    project.shareToken ? `${env.siteUrl}${href(`/p/${project.shareToken}`)}` : null
                  }
                />
                {project.shareToken && (
                  <Link
                    href={href(`/p/${project.shareToken}`)}
                    target="_blank"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary-ink hover:underline"
                  >
                    {t.common.open} <ExternalLinkIcon className="size-3" />
                  </Link>
                )}
              </SectionCell>
            </FrameGrid>
          </FrameBox>
        </TabsContent>
      )}
    </Tabs>
  );
}
