"""HTTP routes for /api/v1.

Versioning is expressed in the URL path — `/api/v1/...`. A future /v2 gets
its own router alongside this one; the v1 shape never changes after release.
"""
from __future__ import annotations

from fastapi import APIRouter

from app.v1.schemas import InvoiceList
from app.warehouse import fetch_invoice_ledger


router = APIRouter(prefix="/api/v1", tags=["invoices"])


@router.get(
    "/invoices",
    response_model=InvoiceList,
    summary="List every invoice from the invoice_ledger mart.",
)
def list_invoices() -> dict[str, list[dict]]:
    """Return the full mart in one payload — no pagination in the skeleton.

    Returned as a plain dict; FastAPI validates and serializes it against
    `response_model=InvoiceList` on the way out. A mart column drift that
    survived dbt tests still cannot silently escape the API boundary
    because `extra="forbid"` on `Invoice` rejects unknown fields, and a
    missing required field raises 500 rather than shipping a broken shape.
    """
    return {"invoices": fetch_invoice_ledger()}
