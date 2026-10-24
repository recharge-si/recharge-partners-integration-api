# Recharge Partners Integration API

Turns each partner's own product export into **one standard JSON feed** and
publishes it at `GET /api/export/<id>`. The export portal
([`t4a-partner-portal-api`](https://github.com/time-4-action/t4a-partner-portal-api))
registers that URL as an **Own Source**, validates it again and pushes it into
Shopify. This app never writes to Shopify itself.

```
partner export (JSON / CSV, each its own shape)
  → bespoke mapping per partner (src/lib/sources/)
    → validated against the portal's feed schema
      → stored, served at /api/export/<id>
        → export portal "Own Source" → Shopify
```

> **New here? Read [`CLAUDE.md`](./CLAUDE.md)** for the full orientation, then
> [`docs/`](./docs) for the feed contract, architecture and roadmap.

## Quick start (local dev)

```bash
cp .env.example .env   # set MONGO_URI (and POINT7_FEED_URL for POINT-7)
npm install
npm run dev            # http://localhost:3000 (from ~/t4a: ./dev.sh integration → :4545)
```

You need a MongoDB reachable at `MONGO_URI`; it only stores run history and the
latest built feed per source.

## Deploy

CI (`.github/workflows/deploy.yml`) checks every pull request. A merge to `main`
builds `ghcr.io/recharge-si/recharge-partners-integration-api`, pushes it and
rolls it out on the server, which runs it with `docker-compose.yml` on host port
**4545**. `scripts/build-and-push.*` remain for a manual build.

## What's in the box

- **Dashboard** of partner sources with their last pull (`/`) and a detail page
  with run history (`/sources/<id>`). Read-only: sources are defined in code.
- **Pull now** per source, **Pull all**, and scheduled pulls via in-process
  `node-cron` (`CRON_*` env vars).
- **Strict feed validation** against the portal's schema — see
  [`docs/FEED-FORMAT.md`](./docs/FEED-FORMAT.md).

## Scripts

| Command                 | What it does |
| ----------------------- | ------------ |
| `npm run dev`           | Dev server |
| `npm run build`         | Production build |
| `npm run lint`          | ESLint |
| `npm run typecheck`     | TypeScript |
| `npm test`              | Unit tests (feed validation, POINT-7 and Unifiber mapping; offline) |
| `npm run check:schema`  | Compare our copy of the feed schema with the one the portal serves |
| `npm run test:unifiber` | Map the **live** Unifiber stock export and print the result |
