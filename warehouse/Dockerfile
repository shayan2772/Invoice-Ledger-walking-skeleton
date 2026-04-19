# dbt-runner: one-shot container. Builds the DuckDB warehouse on the shared
# `data` volume, runs all tests, then exits 0. The `api` service uses
# `depends_on: { condition: service_completed_successfully }` to gate its start.
FROM python:3.12-slim

WORKDIR /warehouse

# All Python packages live in a venv — nothing installed into the system site.
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# dbt-duckdb 1.8.x is the pinned adapter; dbt-core is pulled transitively.
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir "dbt-duckdb==1.8.*"

COPY . .

# Drop privileges. The container still needs write access to /data (shared
# volume) and to /warehouse/{target,logs,dbt_packages}, so we chown those.
RUN useradd --system --uid 1001 --no-create-home dbtuser \
    && mkdir -p /data /warehouse/target /warehouse/logs /warehouse/dbt_packages \
    && chown -R dbtuser:dbtuser /data /warehouse /opt/venv
USER dbtuser

ENV DBT_PROFILES_DIR=/warehouse \
    PATH="/opt/venv/bin:$PATH"

# `dbt seed && dbt build` (not `dbt build` alone) because seeds are declared as
# sources in the staging models, which means the DAG does not formally link
# seed → source. Running seeds explicitly first guarantees the raw tables exist
# before staging models parse. See warehouse/models/staging/_stg_sources.yml.
# `dbt deps` picks up packages (dbt_utils); ignored gracefully if absent.
CMD ["sh", "-c", "dbt deps && dbt seed --full-refresh && dbt build"]
