-- Mart: one row per invoice. THIS is the contract the API reads.
-- Derived fields:
--   balance     = amount_due - amount_paid
--   is_overdue  = status='open' AND due_at < CURRENT_DATE AND balance > 0
-- `is_overdue` intentionally uses CURRENT_DATE at build time. Two identical seed
-- sets produce bit-identical marts except for this column — see the README's
-- idempotency section for the rationale and the alternative (push the
-- derivation to the API) we considered.
select
    i.invoice_id,
    i.invoice_number,
    i.customer_id,
    c.customer_name,
    i.issued_at,
    i.due_at,
    i.status,
    i.amount_due,
    i.amount_paid,
    cast(i.amount_due - i.amount_paid as decimal(12, 2)) as balance,
    (
        i.status = 'open'
        and i.due_at < current_date
        and (i.amount_due - i.amount_paid) > 0
    ) as is_overdue,
    i.last_payment_at
from {{ ref('int_invoices_with_payments') }} as i
inner join {{ ref('stg_customers') }} as c
    on i.customer_id = c.customer_id
