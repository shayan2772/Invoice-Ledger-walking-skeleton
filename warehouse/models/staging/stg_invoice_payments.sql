-- Staging: casts only. No joins, no business logic.
-- Negative `amount` values represent refunds against the prior overpayment; they are
-- not filtered out here — aggregation in the intermediate layer treats the net sum
-- as the authoritative `amount_paid`.
select
    cast(payment_id as integer)          as payment_id,
    cast(invoice_id as integer)          as invoice_id,
    cast(amount as decimal(12, 2))       as amount,
    cast(paid_at as timestamp)           as paid_at
from {{ source('raw', 'invoice_payments') }}
