import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { LanguagesIcon } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { InvoiceDocument, InvoicePrintStyles } from "@/components/finance/invoice-document";
import { InvoiceStatusBadge } from "@/components/finance/invoice-status-badge";
import { PrintButton } from "@/components/finance/print-button";
import { PrintLightMode } from "@/components/finance/print-light-mode";
import { localeMeta, localePath, locales } from "@/i18n/config";
import { format } from "@/i18n/format-message";
import { getLocale, getMessages } from "@/i18n/server";
import { getPublicInvoice } from "@/server/modules/finance/invoices";
import { appTimezone, getSettings } from "@/server/modules/settings/service";
import { MarkViewed } from "./mark-viewed";

export async function generateMetadata(): Promise<Metadata> {
  const t = getMessages(await getLocale());
  return {
    title: t.finance.publicTitle,
    robots: { index: false, follow: false, nocache: true },
    referrer: "no-referrer",
  };
}

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

  return (
    <>
      <MarkViewed token={token} />
      <PrintLightMode />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-3">
          <LogoMark className="size-9" />
          <div>
            <p className="text-sm font-extrabold">{brand}</p>
            <p className="text-xs text-muted-foreground">
              {format(f.invoiceNo, { number: inv.number })}
            </p>
          </div>
          <InvoiceStatusBadge status={inv.status} t={f} />
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            {/* Full page load: switching locale swaps <html lang/dir> and fonts. */}
            <a href={localePath(other, `/i/${token}`)} hrefLang={other} lang={other}>
              <LanguagesIcon /> {localeMeta[other].label}
            </a>
          </Button>
          <PrintButton label={f.printSave} />
        </div>
      </div>
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
      />
    </>
  );
}

/** Public, token-gated invoice page (no sign-in, noindex, printable on A4). */
export default function PublicInvoicePage({ params }: PageProps<"/[locale]/i/[token]">) {
  return (
    <main className="relative min-h-dvh bg-muted/40 px-4 py-8 sm:py-12 print:bg-white print:p-0">
      <InvoicePrintStyles />
      <div aria-hidden className="bg-dots mask-fade-b absolute inset-x-0 top-0 h-72 print:hidden" />
      <div className="relative mx-auto max-w-4xl">
        <Suspense fallback={<Skeleton className="h-[960px] rounded-2xl" />}>
          <PublicInvoice params={params} />
        </Suspense>
      </div>
    </main>
  );
}
