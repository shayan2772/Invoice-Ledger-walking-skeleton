-- Staging: casts + renames only. No joins, no business logic.
-- `status` is canonicalized to lowercase so downstream models match on a single form;
-- accepted values are enforced by the `accepted_values` test on the mart.
select
    cast(invoice_id as integer)                  as invoice_id,
    cast(invoice_number as varchar)              as invoice_number,
    cast(customer_id as integer)                 as customer_id,
    cast(issued_at as date)                      as issued_at,
    cast(due_at as date)                         as due_at,
    lower(trim(cast(status as varchar)))         as status,
    cast(amount_due as decimal(12, 2))           as amount_due
from {{ source('raw', 'invoices') }}
