import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CheckCircle2Icon, CircleDashedIcon, TimerIcon } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Markdown } from "@/components/shared/markdown";
import { localeMeta } from "@/i18n/config";
import { getLocale, getMessages } from "@/i18n/server";
import { formatDate, formatPercent } from "@/lib/format";
import { getPublicProjectByToken } from "@/server/modules/projects/service";
import { appTimezone } from "@/server/modules/settings/service";

export const metadata: Metadata = { robots: { index: false, follow: false } };

async function StatusView({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const data = await getPublicProjectByToken(token);
  if (!data) notFound();
  const locale = await getLocale();
  const t = getMessages(locale);
  const fmt = { locale, timeZone: appTimezone(), calendar: localeMeta[locale].calendar };
  const { project, milestones, updates } = data;
  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <p className="text-sm font-semibold text-muted-foreground">{project.client?.name}</p>
        <h1 className="text-3xl font-black">{project.name}</h1>
        {project.dueDate && (
          <p className="text-sm text-muted-foreground">
            {t.projects.dueDate}: {formatDate(project.dueDate, fmt, "long")}
          </p>
        )}
      </div>
      {project.shareProgress && (
        <Card className="gap-4 p-6">
          <div className="flex items-end justify-between">
            <span className="font-bold">{t.projects.progress}</span>
            <span className="text-3xl font-black text-primary">
              {formatPercent(project.progress, locale)}
            </span>
          </div>
          <Progress value={project.progress} className="h-2.5" />
          {milestones.length > 0 && (
            <ul className="mt-2 space-y-2">
              {milestones.map((m) => (
                <li key={m.id} className="flex items-center gap-3 text-sm">
                  {m.status === "done" ? (
                    <CheckCircle2Icon className="size-5 text-primary" />
                  ) : m.status === "in_progress" ? (
                    <TimerIcon className="size-5 text-warning" />
                  ) : (
                    <CircleDashedIcon className="size-5 text-muted-foreground" />
                  )}
                  <span
                    className={
                      m.status === "done" ? "text-muted-foreground line-through" : "font-semibold"
                    }
                  >
                    {m.title}
                  </span>
                  {m.dueDate && (
                    <span className="ms-auto text-xs text-muted-foreground">
                      {formatDate(m.dueDate, fmt)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
      {updates.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">{t.projects.updates}</h2>
          {updates.map((u) => (
            <Card key={u.id} className="gap-3 p-6">
              <div className="flex items-center gap-2">
                <Badge variant="info">{formatDate(u.createdAt, fmt)}</Badge>
                <h3 className="font-bold">{u.title}</h3>
              </div>
              {u.bodyMd && <Markdown source={u.bodyMd} className="text-[15px]" />}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PublicProjectStatus({ params }: PageProps<"/[locale]/p/[token]">) {
  return (
    <main className="relative min-h-dvh bg-muted/40 px-4 py-12">
      <div aria-hidden className="bg-dots mask-fade-b absolute inset-x-0 top-0 h-80" />
      <div className="relative mx-auto max-w-2xl">
        <div className="mb-8 flex justify-center">
          <LogoMark className="size-10" />
        </div>
        <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
          <StatusView params={params} />
        </Suspense>
      </div>
    </main>
  );
}
