// Streamed while the server component above awaits fetchInvoices().
// In practice the window is small (one internal HTTP call), but exposing
// a loading state makes the render pipeline explicit rather than magical.
export default function Loading() {
  return (
    <main>
      <h1>Invoice Ledger</h1>
      <p>Loading invoices…</p>
    </main>
  );
}
