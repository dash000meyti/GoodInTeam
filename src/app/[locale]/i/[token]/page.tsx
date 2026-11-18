import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { LanguagesIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { FrameBox, FrameCell, FrameGrid } from "@/components/shell/frame";
import { OsLights } from "@/components/shell/os-lights";
import { FrameSection } from "@/components/site/frame";
import { DecorWindowCell, pillClass, teamPath, TitleCell } from "@/components/site/ui";
import { InvoiceDocument, InvoicePrintStyles } from "@/components/finance/invoice-document";
import { InvoiceStatusBadge } from "@/components/finance/invoice-status-badge";
import { Money } from "@/components/finance/money";
import { PrintLightMode } from "@/components/finance/print-light-mode";
import { localeMeta, localePath, locales } from "@/i18n/config";
import { getLocale, getMessages } from "@/i18n/server";
import { formatDate } from "@/lib/format";
import { getPublicInvoice } from "@/server/modules/finance/invoices";
import { appTimezone, getSettings } from "@/server/modules/settings/service";
import { MarkViewed } from "./mark-viewed";
import { PrintPill } from "./print-pill";

export async function generateMetadata(): Promise<Metadata> {
  const t = getMessages(await getLocale());
  return {
    title: t.finance.publicTitle,
    robots: { index: false, follow: false, nocache: true },
    referrer: "no-referrer",
  };
}

/**
 * Print: the box and the document's cell turn static so the document
 * (absolute, InvoicePrintStyles) starts at the top of the first page, and
 * their corner markers go (static, they would anchor to the page and spill
 * onto a blank second one).
 */
const PRINT_FLAT = "print:static print:before:hidden print:after:hidden";

/** The document row: the paper on the dotted desk (md+), edge to edge on phones. */
const DOC_CELL = `md:bg-[radial-gradient(var(--dots)_1px,transparent_1.5px)] md:[background-size:12px_12px] md:p-8 lg:p-12 print:bg-none print:p-0 ${PRINT_FLAT}`;

async function PublicInvoice({ params }: { params: Promise<{ token: string }> }) {
  await connection();
  const { token } = await params;
  const inv = await getPublicInvoice(token);
  if (!inv) notFound();
  const locale = await getLocale();
  const t = getMessages(locale);
  const f = t.finance;
  const profile = getSettings("profile");
  const business = getSettings("business");
  const fmt = { locale, timeZone: appTimezone(), calendar: localeMeta[locale].calendar };
  const other = locales.find((l) => l !== locale)!;
  const brand = profile.brandName[locale] || t.common.appName;
  const parties = [inv.client?.name, inv.project?.name].filter(Boolean).join(" · ");

  return (
    <>
      <MarkViewed token={token} />
      <PrintLightMode />
      <FrameSection
        first
        labelledBy="invoice-title"
        strip={{ index: 1, path: teamPath("INVOICE", inv.number) }}
        className={`print:m-0 print:border-0 ${PRINT_FLAT}`}
      >
        <FrameGrid cols="2-1">
          <TitleCell
            as="h1"
            size="h2"
            titleId="invoice-title"
            eyebrow={brand}
            title={
              <>
                {f.invoice} <span dir="ltr">{inv.number}</span>
              </>
            }
            subtitle={parties || undefined}
            className="justify-center print:hidden"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
              <InvoiceStatusBadge status={inv.status} t={f} />
              {inv.status !== "void" && inv.dueMinor > 0 && (
                <span className="text-muted-foreground">
                  {f.amountDue}:{" "}
                  <Money
                    minor={inv.dueMinor}
                    currency={inv.currency}
                    locale={locale}
                    className="font-bold text-foreground"
                  />
                </span>
              )}
              {inv.dueDate && (
                <span className="text-muted-foreground">
                  {f.dueDate}:{" "}
                  <span className="font-semibold text-foreground">
                    {formatDate(inv.dueDate, fmt)}
                  </span>
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3 pt-2">
              <PrintPill label={f.printSave} className={pillClass.primary} />
              {/* Full page load: switching locale swaps <html lang/dir> and fonts. */}
              <a
                href={localePath(other, `/i/${token}`)}
                hrefLang={other}
                lang={other}
                className={pillClass.outline}
              >
                <LanguagesIcon aria-hidden className="size-4" /> {localeMeta[other].label}
              </a>
            </div>
          </TitleCell>
          <DecorWindowCell path="INVOICES.APP" icon="invoices" className="print:hidden" />
        </FrameGrid>
        <FrameGrid cols={1}>
          <FrameCell pad="none" className={DOC_CELL}>
            <InvoiceDocument
              invoice={inv}
              brand={{
                name: brand,
                email: profile.email,
                phone: profile.phone,
                location: profile.location[locale],
              }}
              paymentInstructions={business.paymentInstructions[locale]}
              locale={locale}
              fmt={fmt}
              t={t}
              className="mx-auto max-w-4xl max-md:border-0"
            />
          </FrameCell>
        </FrameGrid>
      </FrameSection>
    </>
  );
}

/** The page box while the invoice streams: the strip, the header row and the paper, sized alike. */
function PublicInvoiceSkeleton() {
  return (
    <FrameBox
      first
      strip={
        <div className="frame-strip">
          <OsLights size={10} />
          <Skeleton className="hidden h-3.5 w-56 rounded-none md:block" />
        </div>
      }
    >
      <FrameGrid cols="2-1">
        <FrameCell className="flex flex-col justify-center gap-4">
          <Skeleton className="h-[26px] w-36 rounded-none" />
          <Skeleton className="h-10 w-72 max-w-full" />
          <Skeleton className="h-6 w-60 max-w-full" />
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-11 w-48 rounded-full" />
            <Skeleton className="h-11 w-28 rounded-full" />
          </div>
        </FrameCell>
        <FrameCell tone="dots" aria-hidden className="hidden lg:block lg:min-h-[200px]" />
      </FrameGrid>
      <FrameGrid cols={1}>
        <FrameCell pad="none" className={DOC_CELL}>
          <Skeleton className="mx-auto h-[900px] max-w-4xl rounded-none" />
        </FrameCell>
      </FrameGrid>
    </FrameBox>
  );
}

/**
 * Public, token-gated invoice page (no sign-in, noindex, printable on A4),
 * in the site's frame language: the desktop wallpaper, then one framed box —
 * the strip (`GOOD-IN-TEAM/INVOICE/<number>`), the header row (brand, number,
 * status, amount due, print and language pills) beside the decor window, and
 * the document as paper on the dotted desk. Only the document prints.
 */
export default function PublicInvoicePage({ params }: PageProps<"/[locale]/i/[token]">) {
  return (
    <div className="os-desktop min-h-dvh pb-16 print:static print:min-h-0 print:p-0">
      <InvoicePrintStyles />
      <main id="main" className="overflow-x-clip">
        <Suspense fallback={<PublicInvoiceSkeleton />}>
          <PublicInvoice params={params} />
        </Suspense>
      </main>
    </div>
  );
}
