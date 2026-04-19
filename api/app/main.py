"""FastAPI app factory.

CORS is intentionally NOT configured: all browser traffic hits the Next.js
server, and Next.js's server components call FastAPI over the internal
Docker network at render time. The FastAPI origin is never a cross-origin
target from a browser. If a future feature requires client-side fetching,
add an explicit allow-list at that time.
"""
from __future__ import annotations

import os

from fastapi import FastAPI

from app.v1.routes import router as v1_router


def create_app() -> FastAPI:
    # Expose /docs only in dev. In production-like environments (anything
    # where APP_ENV is not explicitly "dev"), the schema and docs routes
    # are disabled to minimise surface.
    is_dev = os.environ.get("APP_ENV", "dev").lower() == "dev"

    app = FastAPI(
        title="Invoice Ledger API",
        version="1.0.0",
        docs_url="/docs" if is_dev else None,
        redoc_url=None,
        openapi_url="/openapi.json" if is_dev else None,
    )
    app.include_router(v1_router)

    @app.get("/healthz", tags=["meta"])
    def healthz() -> dict[str, str]:
        """Liveness probe. Returns 200 as long as the process is up."""
        return {"status": "ok"}

    return app


app = create_app()
