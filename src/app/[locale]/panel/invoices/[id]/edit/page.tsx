import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/panel/page-header";
import { toDateInputValue } from "@/lib/tz";
import { AppError } from "@/server/errors";
import { minorToMajor } from "@/server/modules/finance/calc";
import { bpsToPercent } from "@/server/modules/finance/invoice-calc";
import { getInvoice, invoiceFormOptions } from "@/server/modules/finance/invoices";
import { panelContext } from "@/server/page-context";
import { InvoiceEditor } from "../../_components/invoice-editor";

export default async function EditInvoicePage({
  params,
}: PageProps<"/[locale]/panel/invoices/[id]/edit">) {
  const { id } = await params;
  const { actor, t, href, tz } = await panelContext({ roles: ["owner", "admin"] });
  const f = t.finance;
  const inv = await getInvoice(actor, id).catch((e) => {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  });
  if (inv.status === "paid" || inv.status === "void") redirect(href(`/panel/invoices/${id}`));
  const options = invoiceFormOptions(actor);
  const cur = inv.currency;
  return (
    <>
      <PageHeader
        title={`${f.editInvoice} ${inv.number}`}
        crumbs={[
          { label: f.title, href: href("/panel/finance") },
          { label: f.invoicesTitle, href: href("/panel/invoices") },
          { label: inv.number, href: href(`/panel/invoices/${id}`) },
          { label: t.common.edit },
        ]}
      />
      <InvoiceEditor
        options={options}
        invoice={{
          id: inv.id,
          number: inv.number,
          status: inv.status,
          clientId: inv.clientId,
          projectId: inv.projectId,
          currency: cur,
          issueDate: toDateInputValue(inv.issueDate, tz),
          dueDate: inv.dueDate ? toDateInputValue(inv.dueDate, tz) : null,
          items: inv.items.map((it) => ({
            description: it.description,
            quantity: String(it.quantity),
            unitPrice: String(minorToMajor(it.unitPriceMinor, cur)),
            timeEntryIds: it.timeEntryIds,
          })),
          discount: inv.discountMinor ? String(minorToMajor(inv.discountMinor, cur)) : "",
          taxPercent: bpsToPercent(inv.taxBps),
          notes: inv.notes ?? "",
          terms: inv.terms ?? "",
        }}
      />
    </>
  );
}
