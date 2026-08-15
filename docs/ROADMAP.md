# Roadmap

Ordered roughly by priority. Update as items land.

## 1. Partner sources

✅ **POINT-7** — done & live (`sources/point7.ts` + `point7-map.ts`). Fetches the WP
store export (`POINT7_FEED_URL`), groups rows by `id`, synthesizes `OWN<hash>` skus
for SKU-less rows (collapsing 1:1 dups), prices from `eu rrp +vat` @ 22% gross.
Open decisions worth revisiting with the owner:
  - [ ] `STOCK_WHEN_AVAILABLE` (default 10) — feed only gives 0/1 availability, not qty.
  - [ ] 9 rows have no price at all and are skipped — confirm that's acceptable.
  - [ ] POINT-7's endpoint is slow (~45s); consider caching the export response.

- [ ] **Patrik** and any further partners — add a registry entry + builder each.

## 2. Shopify sync — `src/lib/shopify/sync.ts`

`syncFeedToShopify` is a stub that throws; runs are dry-runs.

- [ ] **SKU matching** against existing Shopify variants (bulk query).
- [ ] **Create** absent products/variants; **update** price/inventory/fields on matches.
- [ ] **Status** from `product.status` (fallback decided per source).
- [ ] **Removal**: track which Shopify products came from which source (tag/metafield
      `recharge-source:<id>`) and delist / zero-stock / keep when they drop out.
- [ ] Return accurate `{ created, updated, removed }`; batch + respect rate limits.
- [ ] Use the `shopify-admin` skill / bundled docs for current GraphQL shapes.

## 3. Authentication / access control

- [ ] No login today. Add at least single-admin auth before any non-private deploy.

## 4. Per-source schedule cadence

- [ ] Today a single global `CRON_EXPRESSION` runs all `scheduleEnabled` sources.
      Add per-source cadence/timezone if partners need different frequencies.

## 5. Observability & ops

- [ ] Notifications (email/webhook) on failed runs.
- [ ] Capture per-product Shopify errors into `ImportRun.issues`.
- [ ] Prune old `ImportRun` history (TTL index).

## 6. Tests

- [ ] Unit tests for `validateFeed` (happy path + every failure → exact path).
- [ ] Pipeline tests for `runExport` with a mocked builder + mocked Shopify.

## Known shortcuts / tech debt

- `planDryRun` reports every product as "created" (no real diff). Fine for dry-run.
- `src/lib/crypto.ts` is currently unused (kept for future native-feed secrets).
- `npm run start` warns under `output: standalone`; use `node .next/standalone/server.js`.
