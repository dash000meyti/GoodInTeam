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
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/shared/copy-button";
import { PageHeader } from "@/components/panel/page-header";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
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
import { FrameNote, KeyValueRow, SectionCell } from "../../projects/_components/frame-parts";
import { ContractActions } from "../_components/contract-actions";
import type { MessageLang, ShareMessageParts } from "../_components/share-dialog";

type Detail = Awaited<ReturnType<typeof getContract>>;

/**
 * Contract detail (framed, like the invoice detail): the page box, notices as
 * tinted note boxes, then the document as a paper box (a meta row over the
 * typeset body) beside one aside box with the details, signatures and
 * timeline as section rows.
 */
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
          path={["CONTRACTS", "TEMPLATES"]}
          actions={
            <Button asChild variant="outline">
              <Link href={href(`/panel/contracts/${k.id}/edit`)}>
                <PencilIcon /> {c.editTemplate}
              </Link>
            </Button>
          }
        />
        <DocumentBox ctx={ctx} d={d} />
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
        path={["CONTRACTS", k.kind, `V${k.version}`]}
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

      <div className="flex flex-col gap-6 lg:gap-8">
        {d.integrity.verified === false && (
          <FrameNote icon={ShieldAlertIcon} tone="destructive">
            {c.integrityFail}
          </FrameNote>
        )}
        {d.unresolved.length > 0 && (
          <FrameNote icon={AlertTriangleIcon} tone="warning">
            {format(c.unresolvedInDoc, {
              n: formatNumber(d.unresolved.length, ctx.locale),
              list: d.unresolved.map((x) => `{{${x}}}`).join("، "),
            })}
          </FrameNote>
        )}
        {d.effectiveStatus === "declined" && k.declineReason && (
          <FrameNote icon={XCircleIcon} tone="destructive">
            <b>{c.declineReasonLabel}:</b> {k.declineReason}
          </FrameNote>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <DocumentBox ctx={ctx} d={d} meta />
          <FrameBox as="aside" density="compact" ariaLabel={c.detailsCard}>
            <DetailsSection ctx={ctx} d={d} />
            <SignaturesSection ctx={ctx} d={d} />
            <TimelineSection ctx={ctx} d={d} />
          </FrameBox>
        </div>
      </div>
    </>
  );
}

/** The document as paper: an optional meta row (kind, version, fingerprint) over the body. */
function DocumentBox({ ctx, d, meta }: { ctx: PanelContext; d: Detail; meta?: boolean }) {
  const c = ctx.t.contracts;
  const k = d.contract;
  return (
    <FrameBox as="article" density="compact" className="bg-card" ariaLabel={k.title}>
      {meta && (
        <FrameGrid cols={1}>
          <FrameCell
            tone="card"
            className="flex flex-wrap items-center gap-2 py-3 text-xs text-muted-foreground"
          >
            <ContractKindBadge kind={k.kind} t={c} />
            <span>{format(c.versionN, { n: formatNumber(k.version, ctx.locale) })}</span>
            {k.contentHash && (
              <span className="flex items-center gap-1 font-mono" dir="ltr" title={k.contentHash}>
                <FingerprintIcon className="size-3.5" /> {shortHash(k.contentHash)}
              </span>
            )}
          </FrameCell>
        </FrameGrid>
      )}
      <FrameGrid cols={1}>
        <FrameCell tone="card" pad="none" className="px-4 py-8 sm:px-10 sm:py-10">
          <ContractDocument bodyMd={k.bodyMd} locale={d.docLocale} />
        </FrameCell>
      </FrameGrid>
    </FrameBox>
  );
}

/** A square hairline code chip (hash, link). */
const CODE_CLASS = "border border-frame-line bg-card px-2 py-1.5 font-mono text-[11px]";

function DetailsSection({ ctx, d }: { ctx: PanelContext; d: Detail }) {
  const { t, fmt, href } = ctx;
  const c = t.contracts;
  const k = d.contract;
  const dt = (v: Date | null) => (v ? formatDateTime(v, fmt) : "—");
  return (
    <FrameGrid cols={1}>
      <SectionCell title={c.detailsCard} titleId="ct-details">
        <dl>
          {k.client && (
            <KeyValueRow label={c.fieldClient}>
              <Link href={href(`/panel/clients/${k.client.id}`)} className="hover:text-primary-ink">
                {k.client.name}
              </Link>
            </KeyValueRow>
          )}
          {k.project && (
            <KeyValueRow label={c.fieldProject}>
              <Link
                href={href(`/panel/projects/${k.project.id}`)}
                className="hover:text-primary-ink"
              >
                {k.project.name}
              </Link>
            </KeyValueRow>
          )}
          {(k.signerName || k.signerEmail) && (
            <KeyValueRow label={c.signer}>
              <span className="block">{k.signerName}</span>
              {k.signerEmail && (
                <span dir="ltr" className="block text-xs font-normal text-muted-foreground">
                  {k.signerEmail}
                </span>
              )}
            </KeyValueRow>
          )}
          <KeyValueRow label={c.sentAt}>{dt(k.sentAt)}</KeyValueRow>
          <KeyValueRow label={c.firstViewedAt}>{dt(k.firstViewedAt)}</KeyValueRow>
          {k.signedAt && (
            <KeyValueRow label={k.requireSignature ? c.signedAt : c.approvedAt}>
              {dt(k.signedAt)}
            </KeyValueRow>
          )}
          {k.declinedAt && <KeyValueRow label={c.declinedAt}>{dt(k.declinedAt)}</KeyValueRow>}
          <KeyValueRow label={c.expiresAt}>
            {k.expiresAt ? dt(k.expiresAt) : c.noExpiry}
          </KeyValueRow>
          <KeyValueRow label={c.version}>
            {format(c.versionN, { n: formatNumber(k.version, ctx.locale) })}
          </KeyValueRow>
          {d.createdByName && <KeyValueRow label={c.createdBy}>{d.createdByName}</KeyValueRow>}
        </dl>
        <div className="mt-4 space-y-2 border-t border-frame-line pt-4">
          <p className="text-xs text-muted-foreground">{c.contentHash}</p>
          {k.contentHash ? (
            <>
              <code dir="ltr" className={cn(CODE_CLASS, "block break-all")}>
                {k.contentHash}
              </code>
              <p
                className={cn(
                  "flex items-center gap-1.5 text-xs font-semibold",
                  d.integrity.verified ? "text-success-ink" : "text-destructive",
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
          <div className="mt-4 space-y-2">
            <p className="text-xs text-muted-foreground">{c.signLink}</p>
            <div className="flex gap-2">
              <code dir="ltr" className={cn(CODE_CLASS, "min-w-0 flex-1 truncate")}>
                {d.signUrl}
              </code>
              <CopyButton value={d.signUrl} size="icon-sm" />
            </div>
          </div>
        )}
      </SectionCell>
    </FrameGrid>
  );
}

function SignaturesSection({ ctx, d }: { ctx: PanelContext; d: Detail }) {
  const { t, fmt } = ctx;
  const c = t.contracts;
  const k = d.contract;
  return (
    <FrameGrid cols={1}>
      <SectionCell title={c.signatures} titleId="ct-signatures" flush>
        {d.signatures.length === 0 ? (
          <p className="px-(--cell-pad) py-6 text-center text-sm text-muted-foreground">
            {c.noSignatures}
          </p>
        ) : (
          <ul className="divide-y divide-dashed divide-frame-line">
            {d.signatures.map((s) => {
              const outdated = s.version !== k.version;
              const device = describeUserAgent(s.userAgent);
              return (
                <li key={s.id} className={cn("space-y-3 p-(--cell-pad)", outdated && "opacity-70")}>
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
                </li>
              );
            })}
          </ul>
        )}
      </SectionCell>
    </FrameGrid>
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

/** Icon ink per event (the tile itself is a neutral hairline square, like the invoice timeline). */
const eventTone: Record<string, string> = {
  created: "text-muted-foreground",
  updated: "text-warning-ink",
  sent: "text-info-ink",
  viewed: "text-[#5119b7] dark:text-[#c684ff]",
  signed: "text-success-ink",
  declined: "text-destructive",
  voided: "text-muted-foreground",
  reminded: "text-info-ink",
};

function TimelineSection({ ctx, d }: { ctx: PanelContext; d: Detail }) {
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
    <FrameGrid cols={1}>
      <SectionCell title={c.timeline} titleId="ct-timeline">
        {events.length === 0 ? (
          <p className="py-2 text-center text-sm text-muted-foreground">{t.common.empty}</p>
        ) : (
          <ol className="relative space-y-5 before:absolute before:inset-y-2 before:start-[13px] before:w-px before:bg-frame-line">
            {events.map((e) => {
              const Icon = eventIcons[e.type] ?? FilePlus2Icon;
              const meta = (e.meta ?? {}) as Record<string, unknown>;
              const device = describeUserAgent(e.userAgent);
              const reason = typeof meta.reason === "string" ? meta.reason : null;
              return (
                <li key={e.id} className="relative flex gap-3">
                  <span
                    className={cn(
                      "z-10 flex size-7 shrink-0 items-center justify-center border border-frame-line bg-card",
                      eventTone[e.type],
                    )}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1 space-y-0.5">
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
                      <p className="mt-1 border border-dashed border-frame-line bg-card px-2 py-1 text-xs break-words">
                        {reason}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </SectionCell>
    </FrameGrid>
  );
}
