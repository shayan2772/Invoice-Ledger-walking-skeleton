import type { InvoiceList } from "./types";
import { parseInvoiceList } from "./parse";

// Read from an env var with no `NEXT_PUBLIC_` prefix — Next.js inlines only
// NEXT_PUBLIC_* vars into the client bundle. This stays server-only, which
// is what we want: the browser never learns the API hostname or port.
const API_BASE = process.env.INTERNAL_API_URL ?? "http://api:8000";

// Bound the outbound wait so a hanging API cannot wedge the page render.
// `AbortSignal.timeout` is the stable (Node 18+, Chromium 103+) way to do
// this without juggling `AbortController` + `setTimeout` ourselves.
const FETCH_TIMEOUT_MS = 5_000;

/**
 * Fetch and validate the invoice ledger from the FastAPI contract.
 *
 * Called only from server components — do not import from a "use client"
 * file. `cache: "no-store"` opts out of Next.js's fetch cache, so every
 * page render re-reads the mart. `parseInvoiceList` validates the wire
 * shape at runtime; a TypeScript `as` cast would hide upstream drift.
 */
export async function fetchInvoices(): Promise<InvoiceList> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}/api/v1/invoices`, {
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    const cause = error instanceof Error ? error.message : String(error);
    throw new Error(`API request failed: ${cause}`);
  }

  if (!response.ok) {
    throw new Error(`API returned ${response.status} ${response.statusText}`);
  }

  const raw: unknown = await response.json();
  return parseInvoiceList(raw);
}
