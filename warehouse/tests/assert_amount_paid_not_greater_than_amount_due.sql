-- Singular test: a non-void invoice may never be overpaid on net.
-- Voided invoices are exempt because payments made before voiding are not
-- refunded through the same table in this skeleton.
-- A failing row here fails `dbt build` and the API never starts.
select
    invoice_id,
    invoice_number,
    status,
    amount_due,
    amount_paid
from {{ ref('invoice_ledger') }}
where status <> 'void'
  and amount_paid > amount_due
