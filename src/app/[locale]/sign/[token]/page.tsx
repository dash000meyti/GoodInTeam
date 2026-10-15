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
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { InteractiveProviders } from "@/components/shared/interactive-providers";
import { LocaleSwitcher } from "@/components/shared/locale-switcher";
import { ThemeToggle } from "@/components/shared/theme-controls";
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

/**
 * Public signing page: /sign/<token> (fa) or /en/sign/<token>.
 * The static shell (background, skeleton) is prerendered; everything that
 * reads the token/DB streams in behind <Suspense> after `connection()`.
 */
export default async function SignPage({ params }: PageProps<"/[locale]/sign/[token]">) {
  const locale = await getLocale();
  return (
    <I18nProvider locale={locale} messages={pickMessages(locale, ["common", "contracts"])}>
      <InteractiveProviders>
        <ContractPrintStyles />
        <div className="relative min-h-dvh bg-muted/40 print:bg-white">
          <div
            aria-hidden
            className="bg-dots mask-fade-b absolute inset-x-0 top-0 h-80 print:hidden"
          />
          <Suspense fallback={<SignSkeleton />}>
            <SignView params={params} locale={locale} />
          </Suspense>
        </div>
      </InteractiveProviders>
    </I18nProvider>
  );
}

function SignSkeleton() {
  return (
    <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <Skeleton className="mb-8 h-10 w-48" />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Skeleton className="h-[70vh] rounded-2xl" />
        <Skeleton className="hidden h-96 rounded-2xl lg:block" />
      </div>
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

  const header = (
    <header className="relative flex items-center justify-between gap-3 print:hidden">
      <div className="flex min-w-0 items-center gap-3">
        <LogoMark className="size-9 shrink-0" />
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
    </header>
  );

  // Void / expired: a friendly message only.
  if (status === "void" || status === "expired") {
    const isVoid = status === "void";
    return (
      <div className="relative mx-auto max-w-xl px-4 py-6 sm:px-6">
        {header}
        <StateCard
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
      </div>
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
    <div
      className={cn(
        "relative mx-auto px-4 py-6 sm:px-6",
        pending ? "max-w-6xl pb-32 lg:pb-10" : "max-w-4xl pb-16",
      )}
    >
      {header}
      {pending && !preview && <ViewTracker token={token} />}

      {preview && (
        <p
          role="note"
          className="mt-6 flex items-center gap-2 rounded-xl border border-info/40 bg-info/10 px-4 py-3 text-sm print:hidden"
        >
          <EyeIcon className="size-4 shrink-0 text-[#006c9c] dark:text-info" /> {c.previewBanner}
        </p>
      )}

      <div className="mt-6 space-y-6">
        {status === "signed" && <SignedBanner data={data} t={t} fmt={fmt} />}
        {status === "declined" && (
          <StateCard
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

        <div
          className={cn(
            "grid grid-cols-[minmax(0,1fr)] gap-6",
            pending && "lg:grid-cols-[minmax(0,1fr)_380px]",
          )}
        >
          <DocumentCard data={data} t={t} fmt={fmt} />
          {pending && (
            <aside className="hidden lg:block print:hidden">
              <Card className="sticky top-6 gap-5 p-6">
                <div className="space-y-1.5">
                  <h2 className="text-lg font-extrabold">
                    {k.requireSignature ? c.signPanelTitle : c.approvePanelTitle}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {k.requireSignature ? c.signPanelHint : c.approvePanelHint}
                  </p>
                </div>
                <SignForm target={target} idPrefix="d" />
              </Card>
            </aside>
          )}
        </div>

        {status === "signed" && <SignedDetails data={data} t={t} fmt={fmt} />}
      </div>

      {pending && (
        <MobileSignBar
          target={target}
          status={k.requireSignature ? c.awaitingYou : c.awaitingYouApprove}
        />
      )}
    </div>
  );
}

function DocumentCard({ data, t, fmt }: { data: PublicContract; t: Messages; fmt: FormatOptions }) {
  const c = t.contracts;
  const { contract: k, brand, docLocale } = data;
  return (
    <Card className="gap-0 overflow-hidden py-0 print:rounded-none print:border-0 print:shadow-none">
      <div className="space-y-4 border-b border-dashed bg-muted/40 px-5 py-5 sm:px-10 print:bg-transparent print:px-0">
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
      <div className="flex items-center gap-2 border-t border-dashed px-5 py-3 text-xs text-muted-foreground sm:px-10 print:px-0">
        <FingerprintIcon className="size-3.5 shrink-0" />
        <span>{c.fingerprint}:</span>
        <span dir="ltr" className="truncate font-mono" title={k.contentHash ?? undefined}>
          {shortHash(k.contentHash)}
        </span>
      </div>
    </Card>
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
        <div className="flex flex-col gap-4 rounded-2xl border border-success/30 bg-success/8 p-5 sm:flex-row sm:items-center print:hidden">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-success/16 text-[#118d57] dark:text-success">
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
}: {
  data: PublicContract;
  t: Messages;
  fmt: FormatOptions;
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
    <Card className="gap-6 p-5 sm:p-8 print:border-0 print:p-0 print:shadow-none">
      <h2 className="text-lg font-extrabold">{c.signatures}</h2>
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
    </Card>
  );
}

function StateCard({
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
    neutral: "bg-grey-500/16 text-grey-700 dark:text-grey-300",
    warning: "bg-warning/16 text-[#b76e00] dark:text-warning",
    destructive: "bg-destructive/16 text-destructive",
  } as const;
  return (
    <Card className={cn("items-center gap-4 p-8 text-center", docTitle && "mt-10")}>
      <span className={cn("flex size-16 items-center justify-center rounded-2xl", tones[tone])}>
        <Icon className="size-8" strokeWidth={1.6} />
      </span>
      {docTitle && <p className="text-sm font-semibold text-muted-foreground">{docTitle}</p>}
      <h1 className="text-xl font-extrabold">{title}</h1>
      <p className="max-w-md text-sm leading-7 text-muted-foreground">{body}</p>
      {note && <p className="max-w-md rounded-xl bg-muted px-4 py-2 text-sm break-words">{note}</p>}
    </Card>
  );
}
