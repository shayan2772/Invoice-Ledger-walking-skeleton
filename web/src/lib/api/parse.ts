import type { Invoice, InvoiceList, InvoiceStatus } from "./types";

// Tiny zero-dependency runtime validator for the /api/v1/invoices payload.
// The TypeScript types are compile-time only; without this parser, an
// upstream rename or nullability change would surface as a `TypeError`
// inside rendering instead of a clean contract failure.

export class ContractError extends Error {
  constructor(public readonly fieldPath: string, reason: string) {
    super(`Invoice contract violation at "${fieldPath}": ${reason}`);
    this.name = "ContractError";
  }
}

const VALID_STATUSES: readonly InvoiceStatus[] = [
  "draft",
  "open",
  "paid",
  "void",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(source: Record<string, unknown>, key: string, path: string): string {
  const value = source[key];
  if (typeof value !== "string") {
    throw new ContractError(`${path}.${key}`, `expected string, got ${typeof value}`);
  }
  return value;
}

function requireNumber(source: Record<string, unknown>, key: string, path: string): number {
  const value = source[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ContractError(`${path}.${key}`, `expected finite number, got ${typeof value}`);
  }
  return value;
}

function requireBoolean(source: Record<string, unknown>, key: string, path: string): boolean {
  const value = source[key];
  if (typeof value !== "boolean") {
    throw new ContractError(`${path}.${key}`, `expected boolean, got ${typeof value}`);
  }
  return value;
}

function requireNullableString(
  source: Record<string, unknown>,
  key: string,
  path: string,
): string | null {
  const value = source[key];
  if (value === null) return null;
  if (typeof value !== "string") {
    throw new ContractError(`${path}.${key}`, `expected string or null, got ${typeof value}`);
  }
  return value;
}

function parseInvoice(raw: unknown, path: string): Invoice {
  if (!isRecord(raw)) {
    throw new ContractError(path, "expected object");
  }
  const status = requireString(raw, "status", path);
  if (!VALID_STATUSES.includes(status as InvoiceStatus)) {
    throw new ContractError(`${path}.status`, `"${status}" not in ${VALID_STATUSES.join("|")}`);
  }
  return {
    invoice_id: requireNumber(raw, "invoice_id", path),
    invoice_number: requireString(raw, "invoice_number", path),
    customer_id: requireNumber(raw, "customer_id", path),
    customer_name: requireString(raw, "customer_name", path),
    issued_at: requireString(raw, "issued_at", path),
    due_at: requireString(raw, "due_at", path),
    status: status as InvoiceStatus,
    amount_due: requireString(raw, "amount_due", path),
    amount_paid: requireString(raw, "amount_paid", path),
    balance: requireString(raw, "balance", path),
    is_overdue: requireBoolean(raw, "is_overdue", path),
    last_payment_at: requireNullableString(raw, "last_payment_at", path),
  };
}

export function parseInvoiceList(raw: unknown): InvoiceList {
  if (!isRecord(raw)) {
    throw new ContractError("$", "expected object envelope");
  }
  const invoices = raw["invoices"];
  if (!Array.isArray(invoices)) {
    throw new ContractError("$.invoices", "expected array");
  }
  return {
    invoices: invoices.map((row, index) => parseInvoice(row, `$.invoices[${index}]`)),
  };
}
