"""Contract test for GET /api/v1/invoices.

Builds an ephemeral DuckDB file with a single known row, points the warehouse
module at it, hits the endpoint over an in-process ASGI transport, and
asserts the response parses cleanly into `InvoiceList` with exact values.

One test per boundary is the rule — this test covers the API ↔ mart seam.
"""
from __future__ import annotations

from decimal import Decimal
from pathlib import Path

import duckdb
import pytest
from httpx import ASGITransport, AsyncClient

from app import warehouse
from app.main import create_app
from app.v1.schemas import InvoiceList, InvoiceStatus


@pytest.fixture
def ephemeral_warehouse(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Create a tiny DuckDB file with two invoice_ledger rows and swap the path in."""
    db_path = tmp_path / "warehouse.duckdb"
    connection = duckdb.connect(str(db_path))
    connection.execute(
        """
        create table invoice_ledger (
            invoice_id        integer,
            invoice_number    varchar,
            customer_id       integer,
            customer_name     varchar,
            issued_at         date,
            due_at            date,
            status            varchar,
            amount_due        decimal(12, 2),
            amount_paid       decimal(12, 2),
            balance           decimal(12, 2),
            is_overdue        boolean,
            last_payment_at   timestamp
        )
        """
    )
    connection.execute(
        """
        insert into invoice_ledger values
            (42, 'INV-0042', 7, 'Test Customer',
             date '2026-01-10', date '2026-02-10', 'open',
             1000.00, 250.00, 750.00, true,
             timestamp '2026-01-15 10:30:00'),
            (43, 'INV-0043', 7, 'Test Customer',
             date '2026-03-01', date '2026-04-01', 'draft',
             500.00, 0.00, 500.00, false,
             null)
        """
    )
    connection.close()

    monkeypatch.setattr(warehouse, "WAREHOUSE_PATH", db_path)
    return db_path


@pytest.mark.asyncio
async def test_list_invoices_returns_valid_contract(ephemeral_warehouse: Path) -> None:
    app = create_app()
    transport = ASGITransport(app=app)

    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/invoices")

    assert response.status_code == 200

    raw = response.json()

    # Assert on the raw JSON first so the test catches drift even if someone
    # regenerates the Pydantic model to paper over a shape change. The exact
    # 12-key set is the wire contract — nothing more, nothing less.
    EXPECTED_KEYS = {
        "invoice_id",
        "invoice_number",
        "customer_id",
        "customer_name",
        "issued_at",
        "due_at",
        "status",
        "amount_due",
        "amount_paid",
        "balance",
        "is_overdue",
        "last_payment_at",
    }
    assert set(raw.keys()) == {"invoices"}
    assert set(raw["invoices"][0].keys()) == EXPECTED_KEYS

    # Decimals must cross the wire as strings so the frontend never does
    # floating-point arithmetic on money.
    amount_due_on_wire = raw["invoices"][0]["amount_due"]
    assert isinstance(amount_due_on_wire, str)
    assert "." in amount_due_on_wire

    # Now re-validate through the Pydantic contract — any unknown field
    # would have failed earlier; this ensures we can still round-trip.
    payload = InvoiceList.model_validate(raw)

    assert len(payload.invoices) == 2

    first, second = payload.invoices
    # Ordering is fetched desc by issued_at; second row was issued later.
    assert second.invoice_id == 42
    assert first.invoice_id == 43

    overdue = next(inv for inv in payload.invoices if inv.invoice_id == 42)
    assert overdue.invoice_number == "INV-0042"
    assert overdue.customer_name == "Test Customer"
    assert overdue.status is InvoiceStatus.open
    assert overdue.amount_due == Decimal("1000.00")
    assert overdue.amount_paid == Decimal("250.00")
    assert overdue.balance == Decimal("750.00")
    assert overdue.is_overdue is True
    assert overdue.last_payment_at is not None
    assert overdue.last_payment_at.year == 2026

    unpaid_draft = next(inv for inv in payload.invoices if inv.invoice_id == 43)
    assert unpaid_draft.status is InvoiceStatus.draft
    assert unpaid_draft.last_payment_at is None  # nullable preserved across JSON
