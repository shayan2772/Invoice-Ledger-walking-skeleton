"use client";

// Renders when the server component throws (e.g. fetchInvoices() fails).
// Kept deliberately plain — a walking skeleton should show errors, not hide
// them — but we only leak `error.message` in development. Production sees
// the opaque `error.digest` that ties back to the server logs, matching
// Next.js's own sanitisation contract.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isDev = process.env.NODE_ENV !== "production";
  return (
    <main>
      <h1>Invoice Ledger</h1>
      <p role="alert">
        Failed to load invoices.
        {isDev && error.message ? (
          <>
            {" "}Reason: <code>{error.message}</code>
          </>
        ) : null}
        {error.digest ? (
          <>
            {" "}Reference: <code>{error.digest}</code>
          </>
        ) : null}
      </p>
      <button type="button" onClick={() => reset()}>
        Retry
      </button>
    </main>
  );
}
