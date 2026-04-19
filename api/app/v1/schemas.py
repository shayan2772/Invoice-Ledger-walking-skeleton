"""Pydantic contract for /api/v1.

Column names and types mirror the `invoice_ledger` dbt mart 1:1. Changing a
field here without changing the mart (or vice versa) is a contract break that
the pytest contract test is designed to catch.

`frozen=True` + `extra="forbid"` together make the contract rigid in both
directions: payloads are immutable and cannot carry unexpected fields.
"""
from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, ConfigDict


class InvoiceStatus(str, Enum):
    draft = "draft"
    open = "open"
    paid = "paid"
    void = "void"


class Invoice(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    invoice_id: int
    invoice_number: str
    customer_id: int
    customer_name: str
    issued_at: date
    due_at: date
    status: InvoiceStatus
    amount_due: Decimal
    amount_paid: Decimal
    balance: Decimal
    is_overdue: bool
    last_payment_at: datetime | None


class InvoiceList(BaseModel):
    model_config = ConfigDict(frozen=True, extra="forbid")

    invoices: list[Invoice]
