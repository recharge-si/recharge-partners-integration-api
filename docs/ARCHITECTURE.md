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
        │   (stored snapshot)   │     buildStandardFeed → validate → store          │
        │                       ▼              │                                    │
        │   CODE registry  ─────┘              ▼                                    │
        │   (sources/registry.ts               MongoDB                              │
        │    + builders.ts)        (importruns, exportsnapshots)                    │
        └──────────────────────────────────────────────────────────────────────────┘
                     │ GET /api/export/<id>
                     ▼
        export portal (t4a-partner-portal-api) Own Source → Shopify
```

This app **publishes** feeds; it never writes to Shopify. The export portal pulls
each `/api/export/<id>` as an Own Source, validates it against the same schema and
does the Shopify push (one engine for every brand, Patrik included).

Partner sources are **defined in code**, not the database. Each has a *builder*
that maps the partner's native export into our standard feed format. MongoDB only
holds **run history** and the latest good feed per source.

## Layers

- **UI (`src/app`, `src/components`)** — App Router, **read-only**. Server
  components read via `lib/data.ts` (registry + latest run). No forms, no mutations.
  Styling follows `guide_for_coherent_design.md` (dark, cyan `#01a0be`).
- **Export endpoint (`/api/export/[id]`)** — serves the stored snapshot from the last
  successful pull (instant; 404 if never pulled). This is the link the portal reads.
- **Domain (`src/lib`)** — the code registry + builders, the run pipeline
  (`run/runExport.ts`), feed schema/validation, the scheduler.
- **Persistence** — MongoDB via Mongoose: `importruns` and `exportsnapshots`.

## Why these choices

- **Sources in code.** The mapping from each partner's x/y/z export to our standard
  format is bespoke and non-trivial — it belongs in version-controlled code, not a
  DB form. Onboarding = a registry entry + a builder function.
- **We validate our own output.** Builders can have bugs; running every built feed
  through the portal's JSON Schema (then Zod for typed data and unique SKUs) means a bad mapping surfaces as a validation
  error (with exact paths) here, before the portal ever sees it.
- **In-process cron via `instrumentation.ts`.** Single long-running Docker container,
  so a co-located `node-cron` is the simplest correct option. `POST /api/cron/run`
  is a manual/external trigger fallback (protected by `CRON_SECRET`).
- **One Shopify writer.** The portal's sync already handles SKU matching, removals,
  rate limits and per-store settings. A second writer here would fight it over the
  same SKUs.

## Failure isolation

- A bad builder for one source never affects others (per-source try/catch in
  `runAllScheduled`).
- Build or validation failure aborts before the stored export is replaced.
- DB unreachable → the dashboard still renders sources from code (without health).

## Security notes

- `POST /api/cron/run` is protected by `CRON_SECRET` (Bearer) when set. Otherwise the
  portal is expected to run behind a firewall / private network.
- **No app-level auth yet** — see ROADMAP. Don't expose publicly as-is.
