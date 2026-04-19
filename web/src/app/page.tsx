import { InvoiceTable } from "@/components/InvoiceTable";
import { fetchInvoices } from "@/lib/api/client";

// Do not prerender at `next build` time: the API is not available in the
// Docker build stage. Runtime renders still fetch on the server per request.
export const dynamic = "force-dynamic";

// Server component. The fetch happens on the Next.js server at render time,
// so the browser receives fully-rendered HTML with the invoice data inlined
// No hydration-only data path; no client-side loading spinner in the happy path.
export default async function InvoiceLedgerPage() {
  const { invoices } = await fetchInvoices();

  return (
    <main>
      <h1>Invoice Ledger</h1>
      <p>
        Read-only view of the <code>invoice_ledger</code> dbt mart via the
        FastAPI <code>/api/v1/invoices</code> contract.
      </p>
      <InvoiceTable invoices={invoices} />
    </main>
  );
}
