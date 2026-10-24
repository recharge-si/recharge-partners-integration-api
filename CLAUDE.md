@AGENTS.md

# CLAUDE.md — Recharge Partners Integration API

> Read this first. It's the orientation for anyone (human or agent) picking up this repo.
> Deeper detail lives in `docs/`. Keep this file current as the project evolves.

## What this is

A self-hosted **portal that publishes standardized product exports for partner
sources**. It never writes to Shopify: the export portal (`t4a-partner-portal-api`)
pulls each export as an **Own Source** and does the Shopify push.

Each partner exports its catalogue in its own shape (x/y/z). The **mapping from
that native shape into OUR standard feed format is bespoke code, per partner**.
The portal then:

1. Runs each partner's code mapping to build a feed in our standard format,
2. **Strictly validates** the built feed against the portal's JSON Schema, then Zod,
3. **Serves it** as a standardized export at `GET /api/export/<id>` (the links the UI lists),
4. On a schedule, rebuilds it. The portal reads that URL and pushes to Shopify.

**Strict by design:** a build error or one invalid field aborts before any write —
a broken mapping can never replace a good stored export. A wipe-guard refuses a build
that returns 0 products.

### Two things that are deliberately NOT here
- **No "add source" UI / no source CRUD.** Sources are defined in **code** because
  each carries complex custom mapping. The UI is **read-only**: it lists sources
  and links to their standardized exports.
- **No per-source config in the DB.** Source definitions live in code; MongoDB only
  stores **run history** (`importruns`).

## Stack & decisions (locked in)

| Concern        | Choice                                              |
| -------------- | --------------------------------------------------- |
| Framework      | **Next.js 16** (App Router, `src/`), React 19, TS   |
| Styling        | **Tailwind CSS v4** — dark theme, cyan `#01a0be` accent (see `guide_for_coherent_design.md`) |
| Fonts          | **Orbitron** (display/wordmark) + **Montserrat** (body) via `next/font` |
| Database       | **MongoDB** via **Mongoose** — run history only      |
| Validation     | **Ajv** against the portal's JSON Schema (canonical) + **Zod** (types, unique SKUs, env) |
| Scheduling     | **In-process `node-cron`**, booted from `instrumentation.ts` |
| Deploy         | **Docker** → image `ghcr.io/recharge-si/recharge-partners-integration-api`, built and deployed by CI on merge to `main` (`.github/workflows/deploy.yml`), run via `docker-compose.yml` on port **4545** |

> ⚠️ This is **Next.js 16** — APIs differ from older training data. Route handler
> `params` are **async** (`await params`); startup hooks go in `instrumentation.ts`.

## Env var names (note the non-default names)

`MONGO_URI`, `MONGO_DB_NAME`, `CRON_ENABLED`, `CRON_EXPRESSION`, `CRON_TIMEZONE`,
`CRON_SECRET`, `POINT7_FEED_URL`, `UNIFIBER_STOCK_URL`. The real `.env` is git-ignored and already populated.
Always read via `getEnv()` from `@/env`; never touch `process.env` directly
(except `NEXT_RUNTIME` in `instrumentation.ts`).

## How a run works (the pipeline)

`src/lib/run/runExport.ts` orchestrates a run for a source id:

```
buildStandardFeed(id)        ← bespoke per-partner mapping (src/lib/sources/builders.ts)
  → validateFeed (portal JSON Schema, then Zod; issues with exact paths — we validate our OWN output)
    → wipe-guard (refuse 0 products)
      → [test trigger stops here — validated, nothing stored]
        → store ExportSnapshot + persist ImportRun (keyed by the string source id)
```

A **pull** (build+validate) is slow because it fetches the partner's live feed
(POINT-7 takes ~45s). So a successful pull **stores** the feed in `ExportSnapshot`,
and `GET /api/export/[id]` serves that stored snapshot **instantly** (~50ms) — it
never builds on the fly. Trigger pulls via `POST /api/sources/[id]/pull` (one),
`POST /api/pull-all` (all), or the cron. Triggers for recorded runs: `manual`,
`scheduled`, `test` (test validates only — no store, no history).

**The feed contract** is the export portal's JSON Schema. `src/lib/feed/own-source.v1.json`
is a verbatim copy; `npm run check:schema` (in CI) compares it with the one the portal
serves. Change the portal's schema first, then copy it here and mirror it in `schema.ts`.

## Onboarding a real partner source

1. Add an entry to `SOURCES` in `src/lib/sources/registry.ts` (id, brand, etc.).
2. Add a builder for that id in `src/lib/sources/builders.ts` — fetch the partner's
   native feed and map it to a `Feed` (must satisfy the feed contract above).
   That's the "complex mapping". Validation will catch any mismatch.
3. Add a test in `test/` against a recorded export (see `test/point7.test.ts`).
4. It appears in the UI, gets an `/api/export/<id>` link, and (if
   `scheduleEnabled`) is pulled by cron. Register that link as an Own Source in
   the export portal so it reaches Shopify.

## Project map

```
src/
  env.ts                      Lazy, validated env (getEnv()). Uses MONGO_URI / MONGO_DB_NAME.
  instrumentation.ts          Boots node-cron on server start (Node runtime only).
  app/
    layout.tsx                Dark shell: nav (logo + "Recharge sources"), background blobs.
    page.tsx                  Dashboard — read-only list of sources + "View export" links.
    sources/[id]/page.tsx     Source detail: info + export link + run history. (read-only)
    api/
      export/[id]/route.ts    GET — serve the STORED snapshot feed (instant; 404 if never pulled).
      sources/[id]/pull/route.ts  POST — pull one source (build + validate + store + run).
      pull-all/route.ts       POST — pull every non-disabled source.
      healthz/route.ts        GET — liveness probe for the CI deploy (no DB).
      cron/run/route.ts       POST — run all scheduled sources (CRON_SECRET-protected).
  lib/
    sources/registry.ts       SOURCES (code-defined) + getSource/exportPath.
    sources/builders.ts       Per-partner mapping fns (BUILDERS) → standard Feed.
    sources/point7.ts         POINT-7 builder: fetch live feed (POINT7_FEED_URL) + map.
    sources/point7-map.ts     POINT-7 pure mapping (group by id, synthetic OWN skus). Tested by test/point7.test.ts.
    sources/unifiber*.ts      Unifiber builder + pure mapping (stock CSV + data/unifiber-master.csv).
    run/runExport.ts          Pipeline orchestrator (build → validate → store → history).
    feed/own-source.v1.json   Copy of the portal's JSON Schema — the canonical contract.
    feed/schema.ts            Zod mirror of it (types, unique externalId/sku).
    feed/validate.ts          validateFeed → issues with exact paths.
    cron/scheduler.ts         startScheduler / runAllScheduled (iterates registry).
    db/mongoose.ts            Cached Mongoose connection.
    models/ImportRun.ts       Run history (sourceId = string code id).
    models/ExportSnapshot.ts  Latest stored standardized feed per source (served by /api/export).
    data.ts                   Read helpers: registry + latest run → DTOs for RSC.
  components/
    SourceStatus.tsx          Dot + badge status presenter.
    ui/StatusBadge.tsx, ui/PingDot.tsx   Shared primitives from the design guide.
docs/                         FEED-FORMAT.md (supplier contract), ARCHITECTURE.md, ROADMAP.md, examples/.
test/                         node:test unit tests + fixtures (recorded partner exports).
public/recharge-logo.png      Brand logo (shown in nav).
guide_for_coherent_design.md  THE design system reference — follow it for any UI work.
```

## Current status

✅ Done: scaffold, dark design system per the guide, code source registry +
builders, standardized export endpoint, read-only dashboard + detail + history,
run pipeline (build → validate → store), cron scheduler, MongoDB run history,
Docker, unit tests.

✅ **POINT-7** — first real source, live. Maps the WP store export → standard feed
(group by `id`, synthetic `OWN<hash>` skus for SKU-less rows, gross price @ 22% VAT,
inventory as availability). Verified end-to-end: 74 products / 354 variants.

✅ **Unifiber** — live (Equipe Trading stock CSV + master export).

🚧 Remaining:
- **Register the exports as Own Sources** in the export portal. See `docs/ROADMAP.md`.
- **POINT-7 open decisions** (see `point7-map.ts`): `STOCK_WHEN_AVAILABLE` (feed only
  gives 0/1 availability), and 9 price-less rows are skipped.

## Conventions

- **UI is read-only and follows `guide_for_coherent_design.md`** (dark, cyan `#01a0be`,
  `rounded-2xl border-neutral-800 bg-neutral-900/60 backdrop-blur-sm` cards, tables
  with `md:hidden` card fallback, sentence case). Reuse `StatusBadge`/`PingDot`.
- **Validation errors carry the exact JSON path** (`products[0].variants[1].sku`).
- **DB access is server-only**; return DTOs from `lib/data.ts` across the RSC boundary.
- Route handlers using Mongo set `runtime = "nodejs"` and `dynamic = "force-dynamic"`.

## Dev commands

```bash
npm run dev      # local dev (reads .env)
npm run build    # production build (Turbopack)
npm run lint     # eslint
npm run typecheck
npm test         # unit tests (offline)
npm run check:schema   # our feed schema copy vs the portal's
```

> `npm run start` warns under `output: standalone`; for a prod-like run use
> `node .next/standalone/server.js`. Docker already does this.
