# Stackblaze preview demo

Minimal **git** app with a **PostgreSQL** addon — built to test preview environments (PR clones app spec + cloned addon + env rebinding).

## What it does

- Connects via `DATABASE_URL` to the Kubero Postgres addon
- `GET /` — inserts a row, returns visit count + `STACKBLAZE_*` preview env vars
- `GET /health` — liveness
- On preview deploys, runs `.kubero/preview-seed.sql` when `STACKBLAZE_PREVIEW_SEED_PATH` is set

## Deploy on Stackblaze

1. Push this repo to GitHub (e.g. `stackblaze-adam/preview-demo`).
2. In the dashboard: **Templates** → **Preview demo (git + Postgres)** → deploy to a pipeline.
3. Pipeline **Settings → Preview environments** → **Auto — clone every matching app**.
4. Open a PR on this repo → expect `pr-<n>-preview-demo` plus a cloned Postgres CR (`*-pr-<n>`).

## Local run

```bash
export DATABASE_URL=postgres://preview:preview@localhost:5432/preview
npm install && npm start
curl http://localhost:8080/
```
prod controls test 1793553317
readme 1793553500
