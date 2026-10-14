import { PageHeader } from "@/components/panel/page-header";
import { invoiceFormOptions } from "@/server/modules/finance/invoices";
import { panelContext } from "@/server/page-context";
import { InvoiceEditor } from "../_components/invoice-editor";

export default async function NewInvoicePage({
  searchParams,
}: PageProps<"/[locale]/panel/invoices/new">) {
  const { actor, t, href } = await panelContext({ roles: ["owner", "admin"] });
  const f = t.finance;
  const sp = await searchParams;
  const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);
  const options = invoiceFormOptions(actor);
  return (
    <>
      <PageHeader
        title={f.newInvoice}
        crumbs={[
          { label: f.title, href: href("/panel/finance") },
          { label: f.invoicesTitle, href: href("/panel/invoices") },
          { label: f.newInvoice },
        ]}
      />
      <InvoiceEditor
        options={options}
        defaults={{ clientId: str(sp.clientId), projectId: str(sp.projectId) }}
      />
    </>
  );
}
