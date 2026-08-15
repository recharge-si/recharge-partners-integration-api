# Recharge Partners Integration API

A self-hosted portal that ingests **supplier product feeds** in one standard JSON
format, **strictly validates** them, and pushes products **one-way into Shopify**
(matched by SKU) — on a schedule or on demand.

> **New here? Read [`CLAUDE.md`](./CLAUDE.md)** for the full orientation, then
> [`docs/`](./docs) for the feed contract, architecture, and roadmap.

## Quick start (local dev)

```bash
cp .env.example .env   # set MONGO_URI and ENCRYPTION_KEY (Shopify optional)
npm install
npm run dev                  # http://localhost:3000
```

You need a MongoDB reachable at `MONGO_URI`. Without Shopify credentials, imports
run as **dry-runs** (validate + record history, no writes) — useful for testing the
whole flow.

## Run with Docker

Configuration is read from the `.env` file next to `docker-compose.yml` (MongoDB is
external — set `MONGO_URI` there). The portal is exposed on **host port 4545**.

```bash
# Build & push the image (date-tagged; --latest / --dev optional):
scripts\build-and-push.cmd --latest      # Windows
./scripts/build-and-push.sh --latest     # macOS/Linux

# Run it (pulls the image, loads .env):
docker compose up -d        # → http://localhost:4545
docker compose down
```

Image name: `time4action/recharge-partners-integration-api`. The in-process cron
(`CRON_ENABLED`/`CRON_EXPRESSION`) runs automatically when the container starts.

## What's in the box

- **Dashboard** of partner sources with health pills (`/`).
- **Add / edit** a source: feed URL, optional auth header (write-only token),
  import options (default status, max staleness, removal policy, wipe-guard).
- **Run test** (validate only) and **Import now** per source, with per-run **History**.
- **Scheduled pulls** via in-process `node-cron` (`CRON_*` env vars).
- **Strict feed validation** — see [`docs/FEED-FORMAT.md`](./docs/FEED-FORMAT.md).

## Status

Foundation complete. The remaining core work is the real Shopify sync
(`src/lib/shopify/sync.ts`) — see [`docs/ROADMAP.md`](./docs/ROADMAP.md).

## Scripts

| Command          | What it does            |
| ---------------- | ----------------------- |
| `npm run dev`    | Dev server              |
| `npm run build`  | Production build        |
| `npm run start`  | Run the production build |
| `npm run lint`   | ESLint                  |
| `npx tsc --noEmit` | Typecheck             |
