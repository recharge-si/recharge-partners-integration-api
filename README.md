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
rolls it out on the server. `scripts/build-and-push.*` remain for a manual build.

**Production runs on t4a** (Hetzner, `77.42.42.60`; time-4-action/t4a-infra, `servers/t4a`) since
2026-11-06, moved from t2:

- `/srv/recharge-si` (owned by `deploy`) holds `docker-compose.yml` (= `deploy/docker-compose.t4a.yml`:
  Traefik routes `recharge-sources.time-4-action.com`, loopback port 4545 for CI's health check) and `.env`.
  The root `docker-compose.yml` is for running it anywhere else.
- MongoDB is t4a's shared one (`/srv/mongo`, database `recharge`, its own user `recharge-si`); the container
  joins the `mongo` network.
- The `production` environment overrides the organization's deploy secrets: `PROD_DEPLOY_HOST` (`77.42.42.60`),
  `PROD_DEPLOY_SSH_KEY` (the key `github-actions@recharge-partners-integration-api-t4a`, public half in
  `/home/deploy/.ssh/authorized_keys` on t4a), `PROD_DEPLOY_FINGERPRINT` (t4a's **ECDSA** host key,
  `SHA256:2wkXWs0QETKFiXKXbxbJRASeNd9I6zigPKVQGBtwfTk`; the Ed25519 one fails with "host key fingerprint
  mismatch") and the variable `DEPLOY_DIR=/srv/recharge-si`.
- Only one copy may run: it pulls partner feeds on its cron and writes to MongoDB. The t2 container is
  stopped, not removed. To go back: delete the DNS record `recharge-sources`, the four settings above, copy
  the `recharge` database back, then `docker compose start` on t2.

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
