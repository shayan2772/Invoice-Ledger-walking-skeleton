-- Intermediate: joins + derived fields that need multiple staging models.
-- Rolls payments up to one row per invoice. Invoices with zero payments
-- survive via LEFT JOIN + COALESCE, with amount_paid = 0.
with payment_rollup as (
    select
        invoice_id,
        sum(amount) as amount_paid,
        max(paid_at) as last_payment_at
    from {{ ref('stg_invoice_payments') }}
    group by invoice_id
)

select
    i.invoice_id,
    i.invoice_number,
    i.customer_id,
    i.issued_at,
    i.due_at,
    i.status,
    i.amount_due,
    coalesce(cast(p.amount_paid as decimal(12, 2)), cast(0 as decimal(12, 2))) as amount_paid,
    p.last_payment_at
from {{ ref('stg_invoices') }} as i
left join payment_rollup as p
    on i.invoice_id = p.invoice_id
