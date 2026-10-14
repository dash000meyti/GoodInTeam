import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangleIcon,
  BellRingIcon,
  CircleSlashIcon,
  EyeIcon,
  FilePlus2Icon,
  FingerprintIcon,
  PencilIcon,
  PenLineIcon,
  SendIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  XCircleIcon,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/shared/copy-button";
import { PageHeader } from "@/components/panel/page-header";
import { ContractDocument } from "@/components/contracts/contract-document";
import { ContractKindBadge, ContractStatusBadge } from "@/components/contracts/contract-badges";
import { SignatureMark } from "@/components/contracts/signature-mark";
import { format } from "@/i18n/format-message";
import { messages } from "@/i18n/messages";
import { formatDateTime, formatNumber, formatRelative } from "@/lib/format";
import { toDateInputValue } from "@/lib/tz";
import { cn } from "@/lib/utils";
import { AppError } from "@/server/errors";
import { shortHash } from "@/server/modules/contracts/lifecycle";
import { brandAndOwner, getContract, longDate } from "@/server/modules/contracts/service";
import { describeUserAgent } from "@/server/modules/contracts/user-agent";
import { panelContext, type PanelContext } from "@/server/page-context";
import { ContractActions } from "../_components/contract-actions";
import type { MessageLang, ShareMessageParts } from "../_components/share-dialog";

type Detail = Awaited<ReturnType<typeof getContract>>;

export default async function ContractPage({
  params,
}: PageProps<"/[locale]/panel/contracts/[id]">) {
  const { id } = await params;
  const ctx = await panelContext({ roles: ["owner", "admin"] });
  const { actor, t, href, tz } = ctx;
  const d = await getContract(actor, id, ctx.now).catch((e) => {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  });
  const { contract: k } = d;
  const c = t.contracts;

  if (k.isTemplate) {
    // Templates have no lifecycle: go straight to their editor.
    return (
      <>
        <PageHeader
          title={k.title}
          crumbs={[
            { label: c.title, href: href("/panel/contracts") },
            { label: c.tab_templates, href: href("/panel/contracts?tab=templates") },
            { label: k.title },
          ]}
          actions={
            <Link
              href={href(`/panel/contracts/${k.id}/edit`)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <PencilIcon className="size-4" /> {c.editTemplate}
            </Link>
          }
        />
        <Card className="p-6 sm:p-10">
          <ContractDocument bodyMd={k.bodyMd} locale={d.docLocale} />
        </Card>
      </>
    );
  }

  const msgParts = (lang: MessageLang): ShareMessageParts => {
    const m = messages[lang].contracts;
    const bo = brandAndOwner(lang);
    return {
      greeting: m.msgGreeting,
      greetingNoName: m.msgGreetingNoName,
      sign: m.msgSign,
      approve: m.msgApprove,
      remind: m.msgRemind,
      actionSign: m.msgActionSign,
      actionApprove: m.msgActionApprove,
      expiry: m.msgExpiry,
      thanks: m.msgThanks,
      kind: m[`kind_${k.kind}`],
      sender: [bo.ownerName, bo.brandName].filter(Boolean).join(lang === "fa" ? " — " : " · "),
      expiryDate: k.expiresAt ? longDate(k.expiresAt, lang) : null,
    };
  };
  const ownerSigned = d.signatures.some((s) => s.role === "owner" && s.version === k.version);

  return (
    <>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            <span className="min-w-0">{k.title}</span>
            <ContractStatusBadge
              status={d.effectiveStatus}
              requireSignature={k.requireSignature}
              t={c}
            />
          </span>
        }
        crumbs={[{ label: c.title, href: href("/panel/contracts") }, { label: k.title }]}
        description={[k.client?.name, k.project?.name].filter(Boolean).join(" · ") || undefined}
        actions={
          <ContractActions
            id={k.id}
            title={k.title}
            status={d.effectiveStatus}
            version={k.version}
            requireSignature={k.requireSignature}
            actions={d.actions}
            signUrl={d.signUrl}
            signerName={k.signerName}
            expiresAt={k.expiresAt ? toDateInputValue(k.expiresAt, tz) : null}
            unresolved={d.unresolved}
            messages={{ fa: msgParts("fa"), en: msgParts("en") }}
            docLocale={d.docLocale}
            countersigned={ownerSigned}
            defaultSignerName={brandAndOwner(ctx.locale).ownerName || actor.user.name}
          />
        }
      />

      {d.integrity.verified === false && (
        <Alert icon={ShieldAlertIcon} tone="destructive">
          {c.integrityFail}
        </Alert>
      )}
      {d.unresolved.length > 0 && (
        <Alert icon={AlertTriangleIcon} tone="warning">
          {format(c.unresolvedInDoc, {
            n: formatNumber(d.unresolved.length, ctx.locale),
            list: d.unresolved.map((x) => `{{${x}}}`).join("، "),
          })}
        </Alert>
      )}
      {d.effectiveStatus === "declined" && k.declineReason && (
        <Alert icon={XCircleIcon} tone="destructive">
          <b>{c.declineReasonLabel}:</b> {k.declineReason}
        </Alert>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="gap-0 overflow-hidden py-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-dashed bg-muted/40 px-4 py-3 text-xs text-muted-foreground sm:px-8">
            <ContractKindBadge kind={k.kind} t={c} />
            <span>{format(c.versionN, { n: formatNumber(k.version, ctx.locale) })}</span>
            {k.contentHash && (
              <span className="flex items-center gap-1 font-mono" dir="ltr" title={k.contentHash}>
                <FingerprintIcon className="size-3.5" /> {shortHash(k.contentHash)}
              </span>
            )}
          </div>
          <div className="px-4 py-8 sm:px-10 sm:py-10">
            <ContractDocument bodyMd={k.bodyMd} locale={d.docLocale} />
          </div>
        </Card>

        <div className="space-y-6">
          <DetailsCard ctx={ctx} d={d} />
          <SignaturesCard ctx={ctx} d={d} />
          <TimelineCard ctx={ctx} d={d} />
        </div>
      </div>
    </>
  );
}

function Alert({
  icon: Icon,
  tone,
  children,
}: {
  icon: LucideIcon;
  tone: "warning" | "destructive";
  children: React.ReactNode;
}) {
  return (
    <div
      role="note"
      className={cn(
        "mb-6 flex gap-3 rounded-2xl border p-4 text-sm",
        tone === "warning"
          ? "border-warning/40 bg-warning/10"
          : "border-destructive/30 bg-destructive/8",
      )}
    >
      <Icon
        className={cn(
          "mt-0.5 size-5 shrink-0",
          tone === "warning" ? "text-[#b76e00] dark:text-warning" : "text-destructive",
        )}
      />
      <p className="min-w-0 break-words">{children}</p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-dashed py-2.5 text-sm last:border-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-end font-semibold break-words">{children}</span>
    </div>
  );
}

function DetailsCard({ ctx, d }: { ctx: PanelContext; d: Detail }) {
  const { t, fmt, href } = ctx;
  const c = t.contracts;
  const k = d.contract;
  const dt = (v: Date | null) => (v ? formatDateTime(v, fmt) : "—");
  return (
    <Card className="gap-2 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-base">{c.detailsCard}</CardTitle>
      </CardHeader>
      <CardContent className="px-5">
        {k.client && (
          <Row label={c.fieldClient}>
            <Link href={href(`/panel/clients/${k.client.id}`)} className="hover:text-primary">
              {k.client.name}
            </Link>
          </Row>
        )}
        {k.project && (
          <Row label={c.fieldProject}>
            <Link href={href(`/panel/projects/${k.project.id}`)} className="hover:text-primary">
              {k.project.name}
            </Link>
          </Row>
        )}
        {(k.signerName || k.signerEmail) && (
          <Row label={c.signer}>
            <span className="block">{k.signerName}</span>
            {k.signerEmail && (
              <span dir="ltr" className="block text-xs font-normal text-muted-foreground">
                {k.signerEmail}
              </span>
            )}
          </Row>
        )}
        <Row label={c.sentAt}>{dt(k.sentAt)}</Row>
        <Row label={c.firstViewedAt}>{dt(k.firstViewedAt)}</Row>
        {k.signedAt && (
          <Row label={k.requireSignature ? c.signedAt : c.approvedAt}>{dt(k.signedAt)}</Row>
        )}
        {k.declinedAt && <Row label={c.declinedAt}>{dt(k.declinedAt)}</Row>}
        <Row label={c.expiresAt}>{k.expiresAt ? dt(k.expiresAt) : c.noExpiry}</Row>
        <Row label={c.version}>
          {format(c.versionN, { n: formatNumber(k.version, ctx.locale) })}
        </Row>
        {d.createdByName && <Row label={c.createdBy}>{d.createdByName}</Row>}
        <div className="space-y-2 pt-3">
          <p className="text-xs text-muted-foreground">{c.contentHash}</p>
          {k.contentHash ? (
            <>
              <code
                dir="ltr"
                className="block rounded-lg bg-muted px-2 py-1.5 font-mono text-[11px] break-all"
              >
                {k.contentHash}
              </code>
              <p
                className={cn(
                  "flex items-center gap-1.5 text-xs font-semibold",
                  d.integrity.verified ? "text-[#118d57] dark:text-[#77ed8b]" : "text-destructive",
                )}
              >
                {d.integrity.verified ? (
                  <ShieldCheckIcon className="size-4" />
                ) : (
                  <ShieldAlertIcon className="size-4" />
                )}
                {d.integrity.verified ? c.integrityOk : c.integrityFail}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">{c.integrityPending}</p>
          )}
        </div>
        {d.signUrl && (
          <div className="space-y-2 pt-4">
            <p className="text-xs text-muted-foreground">{c.signLink}</p>
            <div className="flex gap-2">
              <code
                dir="ltr"
                className="min-w-0 flex-1 truncate rounded-lg bg-muted px-2 py-1.5 font-mono text-[11px]"
              >
                {d.signUrl}
              </code>
              <CopyButton value={d.signUrl} size="icon-sm" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SignaturesCard({ ctx, d }: { ctx: PanelContext; d: Detail }) {
  const { t, fmt } = ctx;
  const c = t.contracts;
  const k = d.contract;
  return (
    <Card className="gap-2 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-base">{c.signatures}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 px-5">
        {d.signatures.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{c.noSignatures}</p>
        ) : (
          d.signatures.map((s) => {
            const outdated = s.version !== k.version;
            const device = describeUserAgent(s.userAgent);
            return (
              <div
                key={s.id}
                className={cn("space-y-3 rounded-xl border p-4", outdated && "opacity-70")}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {s.role === "owner" ? c.roleOwner : c.roleClient}
                    </p>
                    <p className="font-bold">{s.name}</p>
                  </div>
                  {outdated ? (
                    <Badge variant="warning">
                      {format(c.sigOutdated, { n: formatNumber(s.version, ctx.locale) })}
                    </Badge>
                  ) : (
                    <Badge variant="success">
                      {format(c.versionN, { n: formatNumber(s.version, ctx.locale) })}
                    </Badge>
                  )}
                </div>
                <SignatureMark
                  image={s.signatureImage}
                  typedName={s.typedName}
                  alt={`${c.sigDrawn}: ${s.name}`}
                  approvedLabel={c.status_approved}
                />
                <dl className="grid gap-1 text-xs">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{c.sigTime}</dt>
                    <dd>{formatDateTime(s.signedAt, fmt)}</dd>
                  </div>
                  {s.typedName && s.signatureImage && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{c.sigTyped}</dt>
                      <dd>{s.typedName}</dd>
                    </div>
                  )}
                  {s.email && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{t.common.email}</dt>
                      <dd dir="ltr">{s.email}</dd>
                    </div>
                  )}
                  {s.ip && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{c.sigIp}</dt>
                      <dd dir="ltr" className="font-mono">
                        {s.ip}
                      </dd>
                    </div>
                  )}
                  {device && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted-foreground">{c.sigDevice}</dt>
                      <dd dir="ltr" title={s.userAgent ?? undefined}>
                        {device}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{c.fingerprint}</dt>
                    <dd dir="ltr" className="font-mono" title={s.contentHash}>
                      {shortHash(s.contentHash)}
                    </dd>
                  </div>
                </dl>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

const eventIcons: Record<string, LucideIcon> = {
  created: FilePlus2Icon,
  updated: PencilIcon,
  sent: SendIcon,
  viewed: EyeIcon,
  signed: PenLineIcon,
  declined: XCircleIcon,
  voided: CircleSlashIcon,
  reminded: BellRingIcon,
};

const eventTone: Record<string, string> = {
  created: "bg-grey-500/16 text-grey-700 dark:text-grey-300",
  updated: "bg-warning/16 text-[#b76e00] dark:text-warning",
  sent: "bg-info/16 text-[#006c9c] dark:text-info",
  viewed: "bg-violet/16 text-violet",
  signed: "bg-success/16 text-[#118d57] dark:text-success",
  declined: "bg-destructive/16 text-destructive",
  voided: "bg-grey-500/16 text-grey-700 dark:text-grey-300",
  reminded: "bg-info/16 text-[#006c9c] dark:text-info",
};

function TimelineCard({ ctx, d }: { ctx: PanelContext; d: Detail }) {
  const { t, fmt, now } = ctx;
  const c = t.contracts;
  const label = (e: Detail["events"][number]) => {
    const meta = (e.meta ?? {}) as Record<string, unknown>;
    switch (e.type) {
      case "created":
        return meta.duplicatedFrom ? c.event_duplicated : c.event_created;
      case "updated":
        return meta.reissued
          ? format(c.event_reissued, { n: formatNumber(Number(meta.version), ctx.locale) })
          : c.event_updated;
      case "signed":
        return meta.role === "owner"
          ? c.event_countersigned
          : meta.method === "approval"
            ? c.event_approved
            : c.event_signed;
      default:
        return c[`event_${e.type}`];
    }
  };
  const events = [...d.events].reverse();
  return (
    <Card className="gap-2 py-5">
      <CardHeader className="px-5">
        <CardTitle className="text-base">{c.timeline}</CardTitle>
      </CardHeader>
      <CardContent className="px-5">
        {events.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t.common.empty}</p>
        ) : (
          <ol className="relative space-y-5 before:absolute before:inset-y-2 before:start-[15px] before:w-px before:bg-border">
            {events.map((e) => {
              const Icon = eventIcons[e.type] ?? FilePlus2Icon;
              const meta = (e.meta ?? {}) as Record<string, unknown>;
              const device = describeUserAgent(e.userAgent);
              const reason = typeof meta.reason === "string" ? meta.reason : null;
              return (
                <li key={e.id} className="relative flex gap-3">
                  <span
                    className={cn(
                      "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-card",
                      eventTone[e.type],
                    )}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-0.5 pt-1">
                    <p className="text-sm font-semibold">{label(e)}</p>
                    <p className="text-xs text-muted-foreground">
                      <time dateTime={e.at.toISOString()} title={formatDateTime(e.at, fmt)}>
                        {formatDateTime(e.at, fmt)} · {formatRelative(e.at, fmt, now)}
                      </time>
                      {meta.via === "api" && <> · {c.eventViaApi}</>}
                    </p>
                    {(e.ip || device) && (
                      <p className="text-xs text-muted-foreground">
                        <span dir="ltr" className="font-mono">
                          {[e.ip, device].filter(Boolean).join(" · ")}
                        </span>
                      </p>
                    )}
                    {reason && (
                      <p className="mt-1 rounded-lg bg-muted px-2 py-1 text-xs break-words">
                        {reason}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
