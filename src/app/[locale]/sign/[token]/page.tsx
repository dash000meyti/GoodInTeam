import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import {
  CircleSlashIcon,
  ClockAlertIcon,
  EyeIcon,
  FingerprintIcon,
  ShieldCheckIcon,
  XCircleIcon,
  type LucideIcon,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { Skeleton } from "@/components/ui/skeleton";
import { InteractiveProviders } from "@/components/shared/interactive-providers";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ThemeToggle } from "@/components/shared/theme-controls";
import {
  FrameBox,
  FrameCell,
  FrameGrid,
  FrameStripBar,
  HEADING_CLASS,
  framePath,
} from "@/components/shell/frame";
import { ContractDocument } from "@/components/contracts/contract-document";
import { ContractKindBadge, ContractStatusBadge } from "@/components/contracts/contract-badges";
import { AuditSummary, bodyHasTitle, SignatureBlocks } from "@/components/contracts/contract-sheet";
import { PrintButton } from "@/components/contracts/print-button";
import { ContractPrintStyles } from "@/components/contracts/print-styles";
import { localeMeta, type Locale } from "@/i18n/config";
import { I18nProvider } from "@/i18n/client";
import { format } from "@/i18n/format-message";
import type { Messages } from "@/i18n/messages";
import { getLocale, getMessages, pickMessages } from "@/i18n/server";
import { formatDateTime, formatNumber, type FormatOptions } from "@/lib/format";
import { cn } from "@/lib/utils";
import { getActor } from "@/server/auth/session";
import { shortHash } from "@/server/modules/contracts/lifecycle";
import {
  brandAndOwner,
  getPublicContract,
  longDate,
  type PublicContract,
} from "@/server/modules/contracts/service";
import { appTimezone } from "@/server/modules/settings/service";
import { MobileSignBar, SignForm, type SignTarget } from "./_components/sign-panel";
import { SignedCelebration } from "./_components/signed-celebration";
import { ViewTracker } from "./_components/view-tracker";

export async function generateMetadata(): Promise<Metadata> {
  const t = getMessages(await getLocale());
  return {
    title: t.contracts.signMetaTitle,
    robots: { index: false, follow: false, nocache: true },
    referrer: "no-referrer",
  };
}

/** On paper a box or cell is just the page: no hairline, no corner markers, no strip. */
const PRINT_BOX =
  "print:mt-6 print:w-full print:max-w-none print:border-0 print:bg-white print:before:hidden print:after:hidden";
const PRINT_CELL = "print:border-0 print:bg-white print:p-0 print:before:hidden print:after:hidden";
const stripPath = (...s: string[]) => framePath("GOOD-IN-TEAM", "SIGN", ...s);

/**
 * Public signing page: /sign/<token> (fa) or /en/sign/<token>, in the site's
 * frame language on the desktop wallpaper (outside the panel window): the
 * brand box (language, theme), the document box (with the sign panel beside
 * it while a signature is pending) and, once signed, the signatures box.
 * The static shell (wallpaper, skeleton) is prerendered; everything that
 * reads the token/DB streams in behind <Suspense> after `connection()`.
 */
export default async function SignPage({ params }: PageProps<"/[locale]/sign/[token]">) {
  const locale = await getLocale();
  return (
    <I18nProvider locale={locale} messages={pickMessages(locale, ["common", "contracts"])}>
      <InteractiveProviders>
        <ContractPrintStyles />
        <div className="os-desktop min-h-dvh pb-16 print:pb-0">
          <main id="main" className="overflow-x-clip">
            <Suspense fallback={<SignSkeleton locale={locale} />}>
              <SignView params={params} locale={locale} />
            </Suspense>
          </main>
        </div>
      </InteractiveProviders>
    </I18nProvider>
  );
}

function SignSkeleton({ locale }: { locale: Locale }) {
  return (
    <div aria-busy>
      <FrameBox
        as="div"
        first
        strip={<FrameStripBar locale={locale} index={1} path={stripPath()} />}
      >
        <FrameGrid cols={1}>
          <FrameCell className="flex items-center gap-3 py-4">
            <Skeleton className="size-[33px] rounded-none" />
            <Skeleton className="h-5 w-40" />
          </FrameCell>
        </FrameGrid>
      </FrameBox>
      <FrameBox as="div" strip={<div className="frame-strip" />}>
        <FrameGrid cols={1} className="lg:grid-cols-[minmax(0,1fr)_380px]">
          <FrameCell tone="card" className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-[60vh] w-full" />
          </FrameCell>
          <FrameCell className="hidden space-y-4 lg:block">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-40 w-full" />
          </FrameCell>
        </FrameGrid>
      </FrameBox>
    </div>
  );
}

async function SignView({
  params,
  locale,
}: {
  params: Promise<{ token: string }>;
  locale: Locale;
}) {
  await connection();
  const { token } = await params;
  const data = await getPublicContract(token);
  if (!data) notFound();
  const actor = await getActor();
  const preview = !!actor && actor.user.role !== "client";
  const t = getMessages(locale);
  const c = t.contracts;
  const fmt: FormatOptions = {
    locale,
    timeZone: appTimezone(),
    calendar: localeMeta[locale].calendar,
  };
  const { contract: k } = data;
  // Page chrome speaks the UI language; the document card keeps the document's language.
  const brand = brandAndOwner(locale);
  const status = k.effectiveStatus;
  const pending = status === "sent" || status === "viewed";

  /** The first box: brand on the start, language and theme at the end; more rows below. */
  const headBox = (rows?: React.ReactNode) => (
    <FrameBox
      as="header"
      first
      className="print:hidden"
      strip={<FrameStripBar locale={locale} index={1} path={stripPath()} />}
    >
      <FrameGrid cols={1}>
        <FrameCell header className="flex items-center justify-between gap-3 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <LogoMark cell={3} />
            <div className="min-w-0">
              <p className="truncate font-extrabold">{brand.brandName}</p>
              {brand.ownerName && (
                <p className="truncate text-xs text-muted-foreground">{brand.ownerName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </FrameCell>
      </FrameGrid>
      {rows}
    </FrameBox>
  );

  // Void / expired: a friendly message only.
  if (status === "void" || status === "expired") {
    const isVoid = status === "void";
    return (
      <>
        {headBox()}
        <StateBox
          icon={isVoid ? CircleSlashIcon : ClockAlertIcon}
          tone={isVoid ? "neutral" : "warning"}
          title={isVoid ? c.voidTitle : c.expiredTitle}
          body={
            isVoid
              ? format(c.voidBody, { brand: brand.brandName })
              : format(c.expiredBody, {
                  date: longDate(k.expiresAt!, fmt.locale),
                  brand: brand.brandName,
                })
          }
          docTitle={k.title}
        />
      </>
    );
  }

  const target: SignTarget = {
    id: k.id,
    token,
    contentHash: k.contentHash ?? "",
    version: k.version,
    requireSignature: k.requireSignature,
    defaultName: k.signerName ?? "",
    defaultEmail: k.signerEmail ?? "",
    brandName: brand.brandName,
    preview,
  };

  return (
    <div className={pending ? "pb-24 lg:pb-0" : undefined}>
      {pending && !preview && <ViewTracker token={token} />}

      {headBox(
        <>
          {preview && (
            <FrameGrid cols={1}>
              <FrameCell className="bg-info/10 py-3">
                <p role="note" className="flex items-center gap-2 text-sm">
                  <EyeIcon className="size-4 shrink-0 text-info-ink" /> {c.previewBanner}
                </p>
              </FrameCell>
            </FrameGrid>
          )}
          {status === "signed" && (
            <FrameGrid cols={1}>
              <FrameCell pad="none">
                <SignedBanner data={data} t={t} fmt={fmt} />
              </FrameCell>
            </FrameGrid>
          )}
        </>,
      )}

      {status === "declined" && (
        <StateBox
          icon={XCircleIcon}
          tone="destructive"
          title={c.declinedTitle}
          body={format(c.declinedBody, {
            date: formatDateTime(k.declinedAt, fmt),
            brand: brand.brandName,
          })}
          note={k.declineReason ? `${c.declineReasonLabel}: ${k.declineReason}` : undefined}
        />
      )}

      <FrameBox
        ariaLabel={k.title}
        className={PRINT_BOX}
        strip={
          <div className="print:hidden">
            <FrameStripBar locale={locale} index={2} path={stripPath("DOCUMENT")} />
          </div>
        }
      >
        <FrameGrid cols={1} className={pending ? "lg:grid-cols-[minmax(0,1fr)_380px]" : undefined}>
          <DocumentCell data={data} t={t} fmt={fmt} />
          {pending && (
            <FrameCell as="aside" className="hidden lg:block print:hidden">
              <div className="sticky top-6 space-y-5">
                <div className="space-y-1.5">
                  <h2 className={HEADING_CLASS.box}>
                    {k.requireSignature ? c.signPanelTitle : c.approvePanelTitle}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {k.requireSignature ? c.signPanelHint : c.approvePanelHint}
                  </p>
                </div>
                <SignForm target={target} idPrefix="d" />
              </div>
            </FrameCell>
          )}
        </FrameGrid>
      </FrameBox>

      {status === "signed" && <SignedDetails data={data} t={t} fmt={fmt} locale={locale} />}

      {pending && (
        <MobileSignBar
          target={target}
          status={k.requireSignature ? c.awaitingYou : c.awaitingYouApprove}
        />
      )}
    </div>
  );
}

/** The document as a paper cell: meta (parties, dates), the typeset body, the fingerprint. */
function DocumentCell({ data, t, fmt }: { data: PublicContract; t: Messages; fmt: FormatOptions }) {
  const c = t.contracts;
  const { contract: k, brand, docLocale } = data;
  return (
    <FrameCell as="article" tone="card" pad="none" className={cn("min-w-0", PRINT_CELL)}>
      <div className="space-y-4 border-b border-frame-line px-5 py-5 sm:px-10 print:px-0">
        <div className="flex flex-wrap items-center gap-2">
          <ContractKindBadge kind={k.kind} t={c} />
          <ContractStatusBadge
            status={k.effectiveStatus}
            requireSignature={k.requireSignature}
            t={c}
          />
          <span className="text-xs text-muted-foreground">
            {format(c.versionN, { n: formatNumber(k.version, fmt.locale) })}
          </span>
        </div>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">{c.docFrom}</dt>
            <dd className="font-semibold">
              {[brand.ownerName, brand.brandName].filter(Boolean).join(" — ")}
            </dd>
          </div>
          {(k.clientName || k.signerName) && (
            <div>
              <dt className="text-xs text-muted-foreground">{c.preparedFor}</dt>
              <dd className="font-semibold">
                {[k.signerName, k.clientName].filter(Boolean).join(" — ")}
              </dd>
            </div>
          )}
          {k.sentAt && (
            <div>
              <dt className="text-xs text-muted-foreground">{c.sentAt}</dt>
              <dd className="font-semibold">{longDate(k.sentAt, fmt.locale)}</dd>
            </div>
          )}
          {k.expiresAt && k.effectiveStatus !== "signed" && (
            <div>
              <dt className="text-xs text-muted-foreground">{c.expiresAt}</dt>
              <dd className="font-semibold">{longDate(k.expiresAt!, fmt.locale)}</dd>
            </div>
          )}
        </dl>
      </div>
      <div className="px-5 py-8 sm:px-10 sm:py-10 print:px-0">
        {!bodyHasTitle(k.bodyMd) && (
          <h1
            dir={localeMeta[docLocale].dir}
            className="mb-6 text-2xl leading-snug font-black sm:text-3xl"
          >
            {k.title}
          </h1>
        )}
        <ContractDocument bodyMd={k.bodyMd} locale={docLocale} />
      </div>
      <div className="flex items-center gap-2 border-t border-frame-line px-5 py-3 text-xs text-muted-foreground sm:px-10 print:px-0">
        <FingerprintIcon className="size-3.5 shrink-0" />
        <span>{c.fingerprint}:</span>
        <span dir="ltr" className="truncate font-mono" title={k.contentHash ?? undefined}>
          {shortHash(k.contentHash)}
        </span>
      </div>
    </FrameCell>
  );
}

function SignedBanner({ data, t, fmt }: { data: PublicContract; t: Messages; fmt: FormatOptions }) {
  const c = t.contracts;
  const k = data.contract;
  const signer =
    [...data.signatures].reverse().find((s) => s.role === "client")?.name ?? k.signerName ?? "";
  const line = format(c.signedOnBy, { date: formatDateTime(k.signedAt, fmt), name: signer });
  return (
    <SignedCelebration
      id={k.id}
      fallback={
        <div className="flex flex-col gap-4 bg-success/8 p-(--cell-pad) sm:flex-row sm:items-center print:hidden">
          <span className="flex size-11 shrink-0 items-center justify-center border border-frame-line bg-card text-success-ink">
            <ShieldCheckIcon className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold">{k.requireSignature ? c.signedTitle : c.approvedTitle}</p>
            <p className="text-sm text-muted-foreground">{line}</p>
          </div>
          <PrintButton label={c.downloadCopy} />
        </div>
      }
    >
      <p className="text-xl font-extrabold">
        {k.requireSignature ? c.successTitle : c.successApproveTitle}
      </p>
      <p className="text-sm text-muted-foreground">{line}</p>
      <p className="max-w-md text-sm text-muted-foreground">{c.successBody}</p>
      <PrintButton label={c.downloadCopy} variant="default" />
    </SignedCelebration>
  );
}

function SignedDetails({
  data,
  t,
  fmt,
  locale,
}: {
  data: PublicContract;
  t: Messages;
  fmt: FormatOptions;
  locale: Locale;
}) {
  const c = t.contracts;
  const { contract: k, signatures, brand } = data;
  const latest = (role: "client" | "owner") =>
    [...signatures].reverse().find((s) => s.role === role) ?? null;
  const client = latest("client");
  const owner = latest("owner");
  const sig = (s: typeof client) =>
    s
      ? {
          image: s.signatureImage,
          typedName: s.typedName,
          signedAtLabel: formatDateTime(s.signedAt, fmt),
          detail: s.ip,
          outdated:
            s.version !== k.version
              ? format(c.sigOutdated, { n: formatNumber(s.version, fmt.locale) })
              : null,
        }
      : null;
  return (
    <FrameBox
      labelledBy="sign-signatures"
      className={PRINT_BOX}
      strip={
        <div className="print:hidden">
          <FrameStripBar locale={locale} index={3} path={stripPath("SIGNATURES")} />
        </div>
      }
    >
      <FrameGrid cols={1}>
        <FrameCell pad="lg" className={cn("space-y-6", PRINT_CELL)}>
          <h2 id="sign-signatures" className={HEADING_CLASS.box}>
            {c.signatures}
          </h2>
          <SignatureBlocks
            notSignedLabel={c.notSignedYet}
            approvedLabel={c.status_approved}
            parties={[
              {
                label: c.partyFirst,
                name: owner?.name ?? (brand.ownerName || brand.brandName),
                signature: sig(owner),
              },
              { label: c.partySecond, name: client?.name ?? k.signerName, signature: sig(client) },
            ]}
          />
          <AuditSummary
            title={c.auditSummary}
            rows={[
              {
                label: c.version,
                value: format(c.versionN, { n: formatNumber(k.version, fmt.locale) }),
              },
              { label: c.contentHash, value: k.contentHash ?? "—", ltr: true },
              { label: c.sentAt, value: formatDateTime(k.sentAt, fmt) },
              {
                label: k.requireSignature ? c.signedAt : c.approvedAt,
                value: `${formatDateTime(k.signedAt, fmt)}${client?.ip ? ` · ${client.ip}` : ""}`,
              },
            ]}
          />
          <p className="text-[11px] leading-5 text-muted-foreground">{c.legalNote}</p>
        </FrameCell>
      </FrameGrid>
    </FrameBox>
  );
}

/** A state message (void, expired, declined) as its own framed box. */
function StateBox({
  icon: Icon,
  tone,
  title,
  body,
  note,
  docTitle,
}: {
  icon: LucideIcon;
  tone: "neutral" | "warning" | "destructive";
  title: string;
  body: string;
  note?: string;
  docTitle?: string;
}) {
  const tones = {
    neutral: "text-muted-foreground",
    warning: "text-warning-ink",
    destructive: "text-destructive",
  } as const;
  return (
    <FrameBox className="print:hidden">
      <FrameGrid cols={1}>
        <FrameCell pad="lg" className="flex flex-col items-center gap-4 py-12 text-center">
          <span
            className={cn(
              "flex size-16 items-center justify-center border border-frame-line bg-card bg-[radial-gradient(var(--dots)_1px,transparent_1.5px)] [background-size:12px_12px]",
              tones[tone],
            )}
          >
            <Icon className="size-8" strokeWidth={1.6} />
          </span>
          {docTitle && <p className="text-sm font-semibold text-muted-foreground">{docTitle}</p>}
          <h1 className="text-xl font-extrabold">{title}</h1>
          <p className="max-w-md text-sm leading-7 text-muted-foreground">{body}</p>
          {note && (
            <p className="max-w-md border border-dashed border-frame-line bg-card px-4 py-2 text-sm break-words">
              {note}
            </p>
          )}
        </FrameCell>
      </FrameGrid>
    </FrameBox>
  );
}
