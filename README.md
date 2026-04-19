# Invoice Ledger

Invoice Ledger is a small full-stack sample: CSV seed data in git is transformed with dbt (DuckDB), exposed through a versioned read-only FastAPI endpoint, and shown in a Next.js table. The browser talks only to the web app; the web server fetches the API inside Docker.

## How to run

Prerequisite: Docker.

```bash
docker compose up --build
```

- UI: `http://localhost:3000`
- API: `http://localhost:8000/api/v1/invoices`
- Health: `http://localhost:8000/healthz`
- API docs (when `APP_ENV=dev`, the default in compose): `http://localhost:8000/docs`

Compose project name: `invoice-ledger`. Containers: `invoice-ledger-web` and `invoice-ledger-api` stay running. `invoice-ledger-dbt-runner` exits with code 0 after building the warehouse; that is expected.

Host ports default to `3000` (web) and `8000` (api). Override with `WEB_HOST_PORT` and `API_HOST_PORT` in a `.env` file (see `.env.example`).

Stop and remove the data volume:

```bash
docker compose down -v
```

### Logs and checks

```bash
docker compose logs -f api web
docker compose logs dbt-runner
docker compose ps -a
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/healthz
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:8000/api/v1/invoices
curl -sS -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3000/
```

Python in the `api` and `dbt-runner` images is installed only under `/opt/venv`.

Run the API contract tests inside the running API container:

```bash
docker compose exec api sh -c 'cd /app && pytest -o cache_dir=/tmp/pytest-cache -q'
```

Re-run the warehouse build on the shared volume:

```bash
docker compose run --rm dbt-runner
```

## Repository structure

```
.
├── docker-compose.yml     # stack: dbt-runner, api, web + named volume
├── .env.example           # optional host ports and paths
├── warehouse/             # dbt: seeds, models, tests, Dockerfile
├── api/                     # FastAPI: app, tests, Dockerfile, pyproject.toml
└── web/                     # Next.js App Router, Dockerfile, package.json
```

- **warehouse**: dbt project. Seeds are the raw layer. Staging models cast and rename. Intermediate joins invoices to payments. The `invoice_ledger` mart is the table the API reads. YAML and SQL tests guard the mart.
- **api**: FastAPI app. `GET /api/v1/invoices` returns the mart. Pydantic models mirror columns with strict settings. DuckDB is opened read-only; SQL selects an explicit column list.
- **web**: Next.js. The home page is a server component that fetches the API using `INTERNAL_API_URL`, validates JSON with a small runtime parser, and renders `InvoiceTable` (no client-side fetch to the API).

## Architecture (diagrams)

### Docker topology

```
                    [ host ]
                         |
         +---------------+---------------+
         |                               |
  localhost:3000                 localhost:8000
         |                               |
         v                               v
+------------------+         +------------------+
| invoice-ledger-web|       | invoice-ledger-api|
| Next.js :3000     |       | uvicorn :8000     |
+---------+---------+       +---------+---------+
          |                             |
          |   INTERNAL_API_URL          | DuckDB read_only
          +------------->---------------+
                                        |
                                        v
                               +----------------+
                               | Docker volume  |
                               | (shared file)  |
                               +--------+-------+
                                        ^
                                        | write during build only
+------------------+                    |
| invoice-ledger-   |-------------------+
| dbt-runner        |
| exits 0 when done |
+------------------+
```

### Request path for `/`

```
Browser GET /  ->  invoice-ledger-web
                       |
                       |  server component (page.tsx), dynamic render
                       v
                 fetchInvoices() -> http://api:8000/api/v1/invoices
                       |
                       v
                 parseInvoiceList()  (validates JSON shape)
                       |
                       v
                 invoice-ledger-api  GET /api/v1/invoices
                       |
                       v
                 read invoice_ledger from DuckDB on shared volume
```

### dbt lineage

```
  warehouse/seeds/*.csv
            |
            v
  stg_customers , stg_invoices , stg_invoice_payments   (views)
            |              \         /
            |               v       v
            |      int_invoices_with_payments   (view)
            |               |
            |               v
            +-------> invoice_ledger   (table + tests)
```

## Design notes

**Data and API.** The DuckDB file on the shared volume is the boundary between batch transform and online read. Only `dbt-runner` writes it during startup. The API mounts that volume read-only and uses `read_only=True` in DuckDB. `dbt-runner` finishes before `api` starts, so the file is not written during normal API traffic.

**Web and API.** The UI does not call the API from the browser. Next.js fetches on the server over the Docker network. CORS is not used by design.

**Contracts.** `api/app/v1/schemas.py` and `web/src/lib/api/types.ts` describe the same fields; both are maintained by hand next to the mart.

## Idempotency

- Inputs are fixed CSV files in the repo.
- Seed column types are set in `dbt_project.yml`.
- Each stack start runs `dbt deps`, `dbt seed --full-refresh`, and `dbt build` in the runner image so the warehouse is rebuilt from those inputs.
- Models are declarative SQL over refs.

`invoice_ledger.is_overdue` uses `CURRENT_DATE`, so that column can change between calendar days even if seeds are unchanged. The mart SQL file documents this.

## Side effects and guarantees

| Topic | Mechanism |
| --- | --- |
| API cannot write the warehouse file | Compose read-only volume mount for `api` plus DuckDB `read_only=True` |
| No surprise API fields on the wire | `response_model` and Pydantic `extra="forbid"` |
| Browser does not see internal API URL | `INTERNAL_API_URL` is server-only (no `NEXT_PUBLIC_` prefix) |
| Money on the wire | Decimals as strings in JSON; display formatting only uses `Number()` for presentation |
| Startup order | Compose `depends_on` with `service_completed_successfully` and `service_healthy` |

## Testing

| Layer | What runs |
| --- | --- |
| dbt | Generic tests on `invoice_ledger` in YAML plus singular SQL tests under `warehouse/tests/` |
| API | `api/tests/test_v1_invoices_contract.py` (pytest inside the `api` container as above) |
| Web | `npm test` in `web/` (Vitest) |

Optional local runs without Docker: create a venv under `warehouse/` and `api/`, install `dbt-duckdb` and `pip install -e '.[dev]'` for the API, then `dbt build` and `pytest` from those trees; use `npm install` and `npm test` under `web/`.

## Out of scope

Pagination, auth, client-side API calls, incremental dbt, OpenAPI code generation for TypeScript, and CI pipelines are not part of this sample.
