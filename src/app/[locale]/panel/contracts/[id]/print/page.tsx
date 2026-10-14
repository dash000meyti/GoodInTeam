import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AuditSummary,
  ContractSheet,
  SignatureBlocks,
  type SheetParty,
} from "@/components/contracts/contract-sheet";
import { PrintButton } from "@/components/contracts/print-button";
import { ContractPrintStyles } from "@/components/contracts/print-styles";
import { format } from "@/i18n/format-message";
import { messages } from "@/i18n/messages";
import { formatDateTime, formatNumber } from "@/lib/format";
import { localeMeta } from "@/i18n/config";
import { appTimezone } from "@/server/modules/settings/service";
import { AppError } from "@/server/errors";
import { brandAndOwner, getContract } from "@/server/modules/contracts/service";
import { describeUserAgent } from "@/server/modules/contracts/user-agent";
import { panelContext } from "@/server/page-context";

/** Clean A4 print view (in the document's language) with signatures and audit summary. */
export default async function ContractPrintPage({
  params,
}: PageProps<"/[locale]/panel/contracts/[id]/print">) {
  const { id } = await params;
  const { actor, t, href, now } = await panelContext({ roles: ["owner", "admin"] });
  const d = await getContract(actor, id, now).catch((e) => {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  });
  const k = d.contract;
  // The sheet speaks the document's language, whatever the panel language is.
  const lang = d.docLocale;
  const c = messages[lang].contracts;
  const fmt = { locale: lang, timeZone: appTimezone(), calendar: localeMeta[lang].calendar };
  const { brandName, ownerName } = brandAndOwner(lang);

  const latest = (role: "client" | "owner") =>
    [...d.signatures].reverse().find((s) => s.role === role) ?? null;
  const party = (role: "client" | "owner", label: string, name: string | null): SheetParty => {
    const s = latest(role);
    return {
      label,
      name: s?.name ?? name,
      signature: s
        ? {
            image: s.signatureImage,
            typedName: s.typedName,
            signedAtLabel: formatDateTime(s.signedAt, fmt),
            detail: [s.ip, describeUserAgent(s.userAgent)].filter(Boolean).join(" · ") || null,
            outdated:
              s.version !== k.version
                ? format(c.sigOutdated, { n: formatNumber(s.version, lang) })
                : null,
          }
        : null,
    };
  };
  const viewed = d.events.filter((e) => e.type === "viewed");
  const signedEvent = [...d.events]
    .reverse()
    .find((e) => e.type === "signed" && (e.meta as { role?: string } | null)?.role !== "owner");

  return (
    <>
      <ContractPrintStyles />
      <div
        data-print-hide
        className="mx-auto mb-6 flex max-w-[210mm] flex-wrap items-center justify-between gap-3"
      >
        <Button asChild variant="ghost">
          <Link href={href(`/panel/contracts/${k.id}`)}>
            <ChevronLeftIcon className="rtl:rotate-180" /> {t.common.back}
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <p className="hidden text-xs text-muted-foreground sm:block">{t.contracts.printHint}</p>
          <PrintButton label={t.contracts.printButton} variant="default" />
        </div>
      </div>
      <ContractSheet
        brandName={brandName}
        ownerName={ownerName}
        title={k.title}
        bodyMd={k.bodyMd}
        docLocale={lang}
        legalNote={c.legalNote}
        meta={
          <div dir={localeMeta[lang].dir} className="space-y-0.5">
            <p className="font-bold text-foreground">{c[`kind_${k.kind}`]}</p>
            <p>{format(c.versionN, { n: formatNumber(k.version, lang) })}</p>
            {k.client && <p>{k.client.name}</p>}
          </div>
        }
        signatures={
          <SignatureBlocks
            dir={localeMeta[lang].dir}
            notSignedLabel={c.notSignedYet}
            approvedLabel={c.status_approved}
            parties={[
              party("owner", c.partyFirst, ownerName || brandName),
              party("client", c.partySecond, k.signerName ?? k.client?.name ?? null),
            ]}
          />
        }
        audit={
          <div dir={localeMeta[lang].dir}>
            <AuditSummary
              title={c.auditSummary}
              rows={[
                { label: c.documentId, value: k.id, ltr: true },
                {
                  label: c.version,
                  value: format(c.versionN, { n: formatNumber(k.version, lang) }),
                },
                { label: c.contentHash, value: k.contentHash ?? "—", ltr: true },
                { label: c.sentAt, value: formatDateTime(k.sentAt, fmt) },
                {
                  label: c.firstViewedAt,
                  value: viewed[0]
                    ? `${formatDateTime(viewed[0].at, fmt)}${viewed[0].ip ? ` · ${viewed[0].ip}` : ""}`
                    : "—",
                },
                {
                  label: k.requireSignature ? c.signedAt : c.approvedAt,
                  value: k.signedAt
                    ? `${formatDateTime(k.signedAt, fmt)}${signedEvent?.ip ? ` · ${signedEvent.ip}` : ""}`
                    : "—",
                },
                { label: c.printedAt, value: formatDateTime(now, fmt) },
              ]}
            />
          </div>
        }
      />
    </>
  );
}
