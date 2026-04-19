// Hand-mirrored TypeScript types for the /api/v1 contract.
//
// This file is intentionally NOT codegen'd from the Pydantic schema. The
// rigid-contract discipline is that a human reviews any change on both sides
// of the boundary — codegen would paper over drift that the reviewer is
// meant to catch.
//
// Source of truth: api/app/v1/schemas.py (Pydantic).
// Upstream source of truth: warehouse/models/marts/invoice_ledger.sql (dbt).

export type InvoiceStatus = "draft" | "open" | "paid" | "void";

export interface Invoice {
  invoice_id: number;
  invoice_number: string;
  customer_id: number;
  customer_name: string;
  /** ISO date string, e.g. "2026-04-17". */
  issued_at: string;
  /** ISO date string. */
  due_at: string;
  status: InvoiceStatus;
  /** Decimal serialized as string to avoid float precision loss on money. */
  amount_due: string;
  amount_paid: string;
  balance: string;
  is_overdue: boolean;
  /** ISO datetime string, or null if the invoice has no payments. */
  last_payment_at: string | null;
}

export interface InvoiceList {
  invoices: Invoice[];
}
