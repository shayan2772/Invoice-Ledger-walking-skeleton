import type { Invoice } from "@/lib/api/types";

// Formatter built once at module scope — reused across renders.
// Locale is pinned to en-US so the server-rendered output is deterministic
// regardless of the container's default locale.
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "2-digit",
});

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
});

function formatDate(iso: string): string {
  // Append midday UTC to avoid timezone shifting a calendar date by one day.
  return dateFormatter.format(new Date(`${iso}T12:00:00Z`));
}

function formatMoney(decimalString: string): string {
  // Decimals arrive as strings from FastAPI to preserve precision.
  // Using Number here is fine for *display* only — never for arithmetic.
  return currencyFormatter.format(Number(decimalString));
}

export interface InvoiceTableProps {
  invoices: Invoice[];
}

/**
 * Presentational table — no data fetching, no state, no effects.
 * Renders on the server. No "use client" directive.
 */
export function InvoiceTable({ invoices }: InvoiceTableProps) {
  if (invoices.length === 0) {
    return <p data-testid="invoice-empty">No invoices to display.</p>;
  }

  return (
    <table data-testid="invoice-table">
      <caption>Invoice Ledger ({invoices.length} invoices)</caption>
      <thead>
        <tr>
          <th scope="col">Number</th>
          <th scope="col">Customer</th>
          <th scope="col">Issued</th>
          <th scope="col">Due</th>
          <th scope="col">Status</th>
          <th scope="col">Amount Due</th>
          <th scope="col">Amount Paid</th>
          <th scope="col">Balance</th>
          <th scope="col">Overdue</th>
        </tr>
      </thead>
      <tbody>
        {invoices.map((invoice) => (
          <tr key={invoice.invoice_id} data-testid={`invoice-row-${invoice.invoice_id}`}>
            <td>{invoice.invoice_number}</td>
            <td>{invoice.customer_name}</td>
            <td>{formatDate(invoice.issued_at)}</td>
            <td>{formatDate(invoice.due_at)}</td>
            <td>
              <span data-status={invoice.status}>{invoice.status}</span>
            </td>
            <td>{formatMoney(invoice.amount_due)}</td>
            <td>{formatMoney(invoice.amount_paid)}</td>
            <td>{formatMoney(invoice.balance)}</td>
            <td>{invoice.is_overdue ? "Yes" : "No"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
