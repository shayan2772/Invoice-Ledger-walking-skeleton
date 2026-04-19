-- Singular test: is_overdue must only ever be true for status='open' invoices.
-- Catches a future regression where someone treats void/draft/paid as overdue.
select
    invoice_id,
    invoice_number,
    status,
    is_overdue
from {{ ref('invoice_ledger') }}
where is_overdue
  and status <> 'open'
