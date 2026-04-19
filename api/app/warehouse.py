"""Read-only accessor for the DuckDB warehouse.

Single-purpose module:
- opens the DuckDB file `read_only=True` (the container also mounts the
  volume `:ro`, so the filesystem is the ultimate guarantee; this flag is
  a second line of defense at the driver level);
- exposes a context manager and one query function;
- returns plain dicts — Pydantic validates shape at the route layer, not here.

A fresh connection is opened per request. DuckDB connect-on-read is cheap
(a file open, no network, no pool), and a fresh connection means no
long-lived process-level state can leak between requests.
"""
from __future__ import annotations

import os
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

import duckdb


WAREHOUSE_PATH = Path(os.environ.get("WAREHOUSE_PATH", "/data/warehouse.duckdb"))


# Columns are listed explicitly (no `select *`) and ordered to match both
# the mart (warehouse/models/marts/invoice_ledger.sql) and the API schema
# (app/v1/schemas.py). Three places hold the same field list; grepping
# one column name finds all three.
_INVOICE_LEDGER_SQL = """
    select
        invoice_id,
        invoice_number,
        customer_id,
        customer_name,
        issued_at,
        due_at,
        status,
        amount_due,
        amount_paid,
        balance,
        is_overdue,
        last_payment_at
    from invoice_ledger
    order by issued_at desc, invoice_id desc
"""


@contextmanager
def warehouse_connection(path: Path | None = None) -> Iterator[duckdb.DuckDBPyConnection]:
    """Yield a read-only DuckDB connection; closed on exit, always.

    The path is resolved at call time (not at import) so tests can swap
    `WAREHOUSE_PATH` on the module with `monkeypatch.setattr` and have it
    take effect without re-importing.
    """
    resolved = path if path is not None else WAREHOUSE_PATH
    if not resolved.exists():
        raise FileNotFoundError(f"Warehouse file not found: {resolved}")
    connection = duckdb.connect(str(resolved), read_only=True)
    try:
        yield connection
    finally:
        connection.close()


def fetch_invoice_ledger(path: Path | None = None) -> list[dict[str, Any]]:
    """Read every row of the invoice_ledger mart as a list of plain dicts."""
    with warehouse_connection(path) as connection:
        cursor = connection.execute(_INVOICE_LEDGER_SQL)
        columns = [description[0] for description in cursor.description]
        rows = cursor.fetchall()
    return [dict(zip(columns, row, strict=True)) for row in rows]
