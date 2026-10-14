import type { CSSProperties, ReactNode } from "react";
import { LogoMark } from "@/components/brand/logo";
import type { Locale } from "@/i18n/config";
import { localeMeta } from "@/i18n/config";
import { cn } from "@/lib/utils";
import { ContractDocument } from "./contract-document";
import { SignatureMark } from "./signature-mark";

/** True when the markdown body already opens with a level-1 heading (avoid a duplicate title). */
export function bodyHasTitle(bodyMd: string) {
  return /^\s*#\s+\S/.test(bodyMd);
}

/** Light "paper" tokens so the sheet reads like a printed page even in dark mode. */
export const paperStyle = {
  "--background": "#ffffff",
  "--foreground": "#1c252e",
  "--card": "#ffffff",
  "--card-foreground": "#1c252e",
  "--muted": "#f4f6f8",
  "--muted-foreground": "#637381",
  "--border": "rgb(145 158 171 / 0.3)",
  colorScheme: "light",
  color: "#1c252e",
  backgroundColor: "#ffffff",
} as CSSProperties;

export interface SheetParty {
  label: string;
  name: string | null;
  signature: {
    image: string | null;
    typedName: string | null;
    signedAtLabel: string;
    detail?: string | null;
    outdated?: string | null;
  } | null;
}

/** Two signature boxes (first party / counterparty) with a line when unsigned. */
export function SignatureBlocks({
  parties,
  notSignedLabel,
  approvedLabel,
  dir,
}: {
  parties: SheetParty[];
  notSignedLabel: string;
  approvedLabel: string;
  dir?: "rtl" | "ltr";
}) {
  return (
    <div dir={dir} className="grid gap-4 sm:grid-cols-2 print:grid-cols-2" data-print-avoid-break>
      {parties.map((p) => (
        <div key={p.label} className="flex flex-col gap-3 rounded-xl border border-dashed p-4">
          <div>
            <p className="text-xs text-muted-foreground">{p.label}</p>
            <p className="font-bold">{p.name ?? "—"}</p>
          </div>
          <div className="flex min-h-20 items-end">
            {p.signature ? (
              <SignatureMark
                image={p.signature.image}
                typedName={p.signature.typedName}
                alt={p.name ?? p.label}
                approvedLabel={approvedLabel}
              />
            ) : (
              <div className="w-full">
                <div className="h-14" />
                <div className="border-b border-grey-400" />
                <p className="mt-1 text-xs text-muted-foreground">{notSignedLabel}</p>
              </div>
            )}
          </div>
          {p.signature && (
            <div className="space-y-0.5 text-xs text-muted-foreground">
              <p>{p.signature.signedAtLabel}</p>
              {p.signature.detail && (
                <p>
                  <span dir="ltr">{p.signature.detail}</span>
                </p>
              )}
              {p.signature.outdated && <p className="text-[#b76e00]">{p.signature.outdated}</p>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

/** Key/value audit table (document id, version, fingerprint, timestamps…). */
export function AuditSummary({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: ReactNode; ltr?: boolean }[];
}) {
  return (
    <section className="space-y-2" data-print-avoid-break>
      <h2 className="text-sm font-bold">{title}</h2>
      <dl className="grid overflow-hidden rounded-xl border text-xs">
        {rows.map((r) => (
          <div
            key={r.label}
            className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-3 border-b border-dashed px-3 py-2 last:border-0"
          >
            <dt className="text-muted-foreground">{r.label}</dt>
            <dd className={cn("min-w-0 break-all", r.ltr && "font-mono")}>
              {r.ltr ? <span dir="ltr">{r.value}</span> : r.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** A4-like sheet: brand header, title, body, signatures, audit summary, legal note. */
export function ContractSheet({
  brandName,
  ownerName,
  title,
  meta,
  bodyMd,
  docLocale,
  signatures,
  audit,
  legalNote,
  className,
}: {
  brandName: string;
  ownerName?: string;
  title: string;
  meta: ReactNode;
  bodyMd: string;
  docLocale: Locale;
  signatures: ReactNode;
  audit?: ReactNode;
  legalNote: string;
  className?: string;
}) {
  return (
    <article
      data-contract-print
      dir={localeMeta[docLocale].dir}
      lang={docLocale}
      style={paperStyle}
      className={cn(
        "mx-auto w-full max-w-[210mm] rounded-2xl px-5 py-8 shadow-card ring-1 ring-black/5 sm:px-[16mm] sm:py-[18mm] print:max-w-none print:rounded-none print:p-0 print:shadow-none print:ring-0",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b-2 border-grey-800 pb-4">
        <div className="flex items-center gap-3">
          <LogoMark className="size-9" />
          <div>
            <p className="font-extrabold">{brandName}</p>
            {ownerName && <p className="text-xs text-muted-foreground">{ownerName}</p>}
          </div>
        </div>
        <div className="text-end text-xs text-muted-foreground">{meta}</div>
      </div>
      {!bodyHasTitle(bodyMd) && (
        <h1
          dir={localeMeta[docLocale].dir}
          className="mt-8 text-2xl leading-snug font-black sm:text-3xl"
        >
          {title}
        </h1>
      )}
      <div className="mt-8">
        <ContractDocument bodyMd={bodyMd} locale={docLocale} />
      </div>
      <div className="mt-10 space-y-8">
        {signatures}
        {audit}
        <p className="border-t border-dashed pt-4 text-[11px] leading-5 text-muted-foreground">
          {legalNote}
        </p>
      </div>
    </article>
  );
}
