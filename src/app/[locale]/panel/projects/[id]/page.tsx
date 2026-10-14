import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarIcon,
  ClockIcon,
  ExternalLinkIcon,
  GitBranchIcon,
  GlobeIcon,
  WalletIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColorDot } from "@/components/shared/color-dot";
import { Markdown } from "@/components/shared/markdown";
import { PageHeader } from "@/components/panel/page-header";
import { StatCard } from "@/components/panel/stat-card";
import { env } from "@/lib/env";
import { formatDate, formatDateTime, formatHours, formatPercent } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { toDateInputValue } from "@/lib/tz";
import { isAdmin, isStaff } from "@/server/auth/actor";
import { AppError } from "@/server/errors";
import { clientOptions } from "@/server/modules/clients/service";
import { getProject } from "@/server/modules/projects/service";
import { panelContext } from "@/server/page-context";
import { MilestonesPanel } from "../_components/milestones-panel";
import { ProjectActions } from "../_components/project-actions";
import { ProjectStatusBadge } from "../_components/project-status-badge";
import { ShareLinkCard } from "../_components/share-link-card";
import { UpdateComposer } from "../_components/update-composer";
import { kindLabels } from "../_components/update-kinds";

export default async function ProjectPage({ params }: PageProps<"/[locale]/panel/projects/[id]">) {
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
  const showProgress = staff || project.shareProgress;
  const daysLeft = project.dueDate
    ? Math.ceil((project.dueDate.getTime() - ctx.now) / 86_400_000)
    : null;

  const formValues = {
    ...project,
    startDate: project.startDate ? toDateInputValue(project.startDate, tz) : null,
    dueDate: project.dueDate ? toDateInputValue(project.dueDate, tz) : null,
  };

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <ColorDot color={project.color} className="size-3.5" />
            {project.name}
            <ProjectStatusBadge status={project.status} t={p} />
          </span>
        }
        crumbs={[{ label: p.title, href: href("/panel/projects") }, { label: project.name }]}
        description={project.client?.name}
        actions={
          admin && (
            <ProjectActions
              project={formValues}
              clients={clientOptions(actor)}
              archived={!!project.archivedAt}
            />
          )
        }
      />

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {showProgress && (
          <Card className="gap-3 p-6">
            <p className="text-sm font-semibold text-muted-foreground">{p.progress}</p>
            <p className="text-2xl font-extrabold">{formatPercent(project.progress, locale)}</p>
            <Progress value={project.progress} />
          </Card>
        )}
        {stats.trackedMs != null && (
          <StatCard
            label={p.timeSpent}
            value={`${formatHours(stats.trackedMs, locale)} ${t.common.hours}`}
            hint={
              project.estimateHours ? `/ ${project.estimateHours} ${t.common.hours}` : undefined
            }
            icon={ClockIcon}
            tone="info"
          />
        )}
        {project.dueDate && (
          <StatCard
            label={p.dueDate}
            value={formatDate(project.dueDate, fmt)}
            hint={
              daysLeft != null
                ? daysLeft >= 0
                  ? `${daysLeft} ${p.daysLeft}`
                  : p.overdueBy.replace("{n}", String(-daysLeft))
                : undefined
            }
            icon={CalendarIcon}
            tone={daysLeft != null && daysLeft < 0 ? "destructive" : "warning"}
          />
        )}
        {admin && project.budgetMinor != null && (
          <StatCard
            label={p.budget}
            value={formatMoney(project.budgetMinor, project.currency, locale, { compact: true })}
            hint={p[`billing_${project.billingType}`]}
            icon={WalletIcon}
            tone="success"
          />
        )}
      </div>

      <Tabs defaultValue="overview" className="mt-8">
        <TabsList>
          <TabsTrigger value="overview">{p.overview}</TabsTrigger>
          {showProgress && <TabsTrigger value="milestones">{p.milestones}</TabsTrigger>}
          <TabsTrigger value="updates">{p.updates}</TabsTrigger>
          {admin && <TabsTrigger value="portal">{p.portal}</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t.common.description}</CardTitle>
              </CardHeader>
              <CardContent>
                {project.description ? (
                  <Markdown source={project.description} className="text-[15px]" />
                ) : (
                  <p className="text-sm text-muted-foreground">—</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t.common.details}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Row label={p.client} value={project.client?.name ?? p.noClient} />
                <Row label={p.startDate} value={formatDate(project.startDate, fmt)} />
                {staff && <Row label={p.billingType} value={p[`billing_${project.billingType}`]} />}
                {admin && project.hourlyRateMinor != null && (
                  <Row
                    label={p.hourlyRate}
                    value={formatMoney(project.hourlyRateMinor, project.currency, locale)}
                  />
                )}
                {admin &&
                  stats.money.map((m) => (
                    <Row
                      key={m.kind + m.currency}
                      label={
                        m.kind === "income"
                          ? t.panel.monthIncome.split(" ")[0]!
                          : t.panel.monthExpense.split(" ")[0]!
                      }
                      value={formatMoney(m.total, m.currency, locale)}
                    />
                  ))}
                {project.websiteUrl && (
                  <a
                    href={project.websiteUrl}
                    target="_blank"
                    rel="noopener"
                    className="flex items-center gap-2 font-semibold text-primary hover:underline"
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
                    className="flex items-center gap-2 font-semibold text-primary hover:underline"
                  >
                    <GitBranchIcon className="size-4" /> {p.repoUrl}{" "}
                    <ExternalLinkIcon className="size-3" />
                  </a>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {showProgress && (
          <TabsContent value="milestones">
            <Card>
              <CardContent>
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
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="updates">
          <div className="space-y-6">
            {staff && <UpdateComposer projectId={project.id} locale={locale} />}
            {updates.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t.common.empty}</p>
            ) : (
              <ol className="space-y-4">
                {updates.map((u) => (
                  <Card key={u.id} className="gap-3 p-6">
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
                      <h3 className="font-bold">{u.title}</h3>
                      {staff && !u.visibleToClient && (
                        <Badge variant="neutral">{t.common.draft}</Badge>
                      )}
                      <span className="ms-auto text-xs text-muted-foreground">
                        {u.author?.name} · {formatDateTime(u.createdAt, fmt)}
                      </span>
                    </div>
                    {u.bodyMd && <Markdown source={u.bodyMd} className="text-[15px]" />}
                  </Card>
                ))}
              </ol>
            )}
          </div>
        </TabsContent>

        {admin && (
          <TabsContent value="portal">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>{p.portal}</CardTitle>
                  <CardDescription>{p.portalHint}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
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
                    <div
                      key={k}
                      className="flex items-center justify-between border-b border-dashed py-2 last:border-0"
                    >
                      <span>{p[k]}</span>
                      <Badge variant={project[k] ? "success" : "neutral"}>
                        {project[k] ? t.common.yes : t.common.no}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>{p.publicLink}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ShareLinkCard
                    projectId={project.id}
                    url={
                      project.shareToken
                        ? `${env.siteUrl}${href(`/p/${project.shareToken}`)}`
                        : null
                    }
                  />
                  {project.shareToken && (
                    <Link
                      href={href(`/p/${project.shareToken}`)}
                      target="_blank"
                      className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                    >
                      {t.common.open} <ExternalLinkIcon className="size-3" />
                    </Link>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
      {isClient && null}
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-dashed pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
