-- Singular test: symmetric invariant to assert_amount_paid_not_greater_than_amount_due.
-- A non-void invoice may never have negative net paid. Refunds exist (negative
-- payment rows) but their net sum across all payments for an invoice cannot
-- go below zero outside of the void lifecycle — that would mean we refunded
-- more than we ever collected.
select
    invoice_id,
    invoice_number,
    status,
    amount_paid
from {{ ref('invoice_ledger') }}
where status <> 'void'
  and amount_paid < 0
