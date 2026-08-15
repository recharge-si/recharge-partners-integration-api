# Architecture

## Big picture

```
        ┌──────────────────────────── Next.js 16 app ────────────────────────────┐
        │                                                                          │
        │  instrumentation.ts ── startScheduler() ── node-cron (CRON_EXPRESSION)   │
        │                                              │                            │
        │  Read-only UI (RSC) ──┐                      ▼                            │
        │   list + detail       │               runAllScheduled()                  │
        │                       │                      │                            │
        │  GET /api/export/[id] ┤   runExport(id, trigger)                          │
        │   (build+validate)    │     buildStandardFeed → validate → sync/dry-run   │
        │                       ▼              │                    │               │
        │   CODE registry  ─────┘              ▼                    ▼               │
        │   (sources/registry.ts               MongoDB           Shopify Admin      │
        │    + builders.ts)                  (importruns)        GraphQL API        │
        └──────────────────────────────────────────────────────────────────────────┘
```

Partner sources are **defined in code**, not the database. Each has a *builder*
that maps the partner's native export into our standard feed format. MongoDB only
holds **run history**.

## Layers

- **UI (`src/app`, `src/components`)** — App Router, **read-only**. Server
  components read via `lib/data.ts` (registry + latest run). No forms, no mutations.
  Styling follows `guide_for_coherent_design.md` (dark, cyan `#01a0be`).
- **Export endpoint (`/api/export/[id]`)** — runs a source's builder, validates the
  result against our own contract, returns standard-format JSON. This is the link.
- **Domain (`src/lib`)** — the code registry + builders, the run pipeline
  (`run/runExport.ts`), feed schema/validation, Shopify client/sync, the scheduler.
- **Persistence** — MongoDB via Mongoose, `importruns` collection only.

## Why these choices

- **Sources in code.** The mapping from each partner's x/y/z export to our standard
  format is bespoke and non-trivial — it belongs in version-controlled code, not a
  DB form. Onboarding = a registry entry + a builder function.
- **We validate our own output.** Builders can have bugs; running every built feed
  through the same strict Zod contract means a bad mapping surfaces as a validation
  error (with exact paths) instead of a corrupt export or half-updated store.
- **In-process cron via `instrumentation.ts`.** Single long-running Docker container,
  so a co-located `node-cron` is the simplest correct option. `POST /api/cron/run`
  is a manual/external trigger fallback (protected by `CRON_SECRET`).
- **Dry-run until Shopify is configured.** The whole flow (build, validate, schedule,
  history) works before Shopify credentials exist.

## Failure isolation

- A bad builder for one source never affects others (per-source try/catch in
  `runAllScheduled`).
- Build or validation failure aborts before any Shopify write.
- DB unreachable → the dashboard still renders sources from code (without health).

## Security notes

- `POST /api/cron/run` is protected by `CRON_SECRET` (Bearer) when set. Otherwise the
  portal is expected to run behind a firewall / private network.
- **No app-level auth yet** — see ROADMAP. Don't expose publicly as-is.
- `src/lib/crypto.ts` (AES-256-GCM) exists for future native-feed secrets but is
  currently unused (no DB-stored tokens).
