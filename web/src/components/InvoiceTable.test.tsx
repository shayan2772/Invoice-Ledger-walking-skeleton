import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { Invoice } from "@/lib/api/types";

import { InvoiceTable } from "./InvoiceTable";

const fixture: Invoice[] = [
  {
    invoice_id: 42,
    invoice_number: "INV-0042",
    customer_id: 7,
    customer_name: "Test Customer",
    issued_at: "2026-01-10",
    due_at: "2026-02-10",
    status: "open",
    amount_due: "1000.00",
    amount_paid: "250.00",
    balance: "750.00",
    is_overdue: true,
    last_payment_at: "2026-01-15T10:30:00",
  },
  {
    invoice_id: 43,
    invoice_number: "INV-0043",
    customer_id: 7,
    customer_name: "Test Customer",
    issued_at: "2026-03-01",
    due_at: "2026-04-01",
    status: "draft",
    amount_due: "500.00",
    amount_paid: "0.00",
    balance: "500.00",
    is_overdue: false,
    last_payment_at: null,
  },
];

describe("InvoiceTable", () => {
  it("renders one row per invoice with the expected cells", () => {
    render(<InvoiceTable invoices={fixture} />);

    const table = screen.getByTestId("invoice-table");
    expect(within(table).getAllByRole("row")).toHaveLength(1 + fixture.length);

    const overdueRow = screen.getByTestId("invoice-row-42");
    expect(within(overdueRow).getByText("INV-0042")).toBeInTheDocument();
    expect(within(overdueRow).getByText("open")).toBeInTheDocument();
    // Formatted as en-US currency.
    expect(within(overdueRow).getByText("$1,000.00")).toBeInTheDocument();
    expect(within(overdueRow).getByText("$750.00")).toBeInTheDocument();
    expect(within(overdueRow).getByText("Yes")).toBeInTheDocument();

    const draftRow = screen.getByTestId("invoice-row-43");
    expect(within(draftRow).getByText("draft")).toBeInTheDocument();
    expect(within(draftRow).getByText("No")).toBeInTheDocument();
  });

  it("shows an empty-state message when there are no invoices", () => {
    render(<InvoiceTable invoices={[]} />);
    expect(screen.getByTestId("invoice-empty")).toBeInTheDocument();
    expect(screen.queryByTestId("invoice-table")).not.toBeInTheDocument();
  });
});
