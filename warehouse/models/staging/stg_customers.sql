-- Staging: casts + renames only. No joins, no business logic.
select
    cast(customer_id as integer)      as customer_id,
    cast(name as varchar)             as customer_name,
    cast(created_at as timestamp)     as created_at
from {{ source('raw', 'customers') }}
