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

✅ **Unifiber** — done & live (`sources/unifiber.ts` + `unifiber-map.ts`).

- [ ] Further partners — add a registry entry + builder each. (Patrik is not one:
      its catalogue reaches the export portal through the PNV sync.)

## 2. Hand-off to the export portal

This app publishes; the export portal pushes to Shopify. Removed here: the
`syncFeedToShopify` stub, the Admin client, `SHOPIFY_*` and `ENCRYPTION_KEY`.

- [ ] Register each `/api/export/<id>` as an Own Source in the export portal
      (Integrations → Own Sources) for the store that sells the brand.
- [ ] The portal can only reach this app if `/api/export/*` is reachable from it;
      keep the rest private (see 3).

## 3. Authentication / access control

- [ ] No login today. Add at least single-admin auth before any non-private deploy.

## 4. Per-source schedule cadence

- [ ] Today a single global `CRON_EXPRESSION` runs all `scheduleEnabled` sources.
      Add per-source cadence/timezone if partners need different frequencies.

## 5. Observability & ops

- [ ] Notifications (email/webhook) on failed runs.
- [ ] Prune old `ImportRun` history (TTL index).

## 6. Tests

✅ `npm test`: `validateFeed`, POINT-7 and Unifiber mapping against recorded exports.
- [ ] Pipeline tests for `runExport` with a mocked builder and an in-memory Mongo.

## Known shortcuts / tech debt

- `npm run start` warns under `output: standalone`; use `node .next/standalone/server.js`.
