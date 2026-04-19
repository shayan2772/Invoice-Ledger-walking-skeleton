# api: long-running FastAPI/uvicorn service that exposes /api/v1/invoices.
# Mounts the shared `data` volume read-only — the API cannot mutate warehouse
# state even if its code tried.
FROM python:3.12-slim

WORKDIR /app

# All Python packages live in a venv — nothing installed into the system site.
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy manifest first for layer cache, then application + tests, then install.
COPY pyproject.toml .
COPY app ./app
COPY tests ./tests
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir ".[dev]"

# Drop privileges — the service has no need for root, and compose pins
# the warehouse mount :ro so even if it tried, it could not write.
RUN useradd --system --uid 1001 --no-create-home appuser \
    && chown -R appuser:appuser /app /opt/venv
USER appuser

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PATH="/opt/venv/bin:$PATH"

EXPOSE 8000

# Health probe baked into the image so `docker run` (outside compose)
# also reports healthy/unhealthy — compose layers its own healthcheck
# for start-order gating.
HEALTHCHECK --interval=15s --timeout=3s --start-period=3s --retries=5 \
    CMD /opt/venv/bin/python -c "import urllib.request,sys; urllib.request.urlopen('http://localhost:8000/healthz', timeout=2)" || exit 1

CMD ["/opt/venv/bin/uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--no-server-header"]
