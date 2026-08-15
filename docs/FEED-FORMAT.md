# Feed format — our company standard (`schemaVersion 1.0`)

This is the contract every partner feed must satisfy. Send this page to suppliers.
The portal **validates** against it and **never guesses or coerces**. One invalid
field rejects the whole import; validation errors are reported with the exact path
(e.g. `products[0].variants[1].sku`) so you can forward them straight to the supplier.

The authoritative machine-readable definition is `src/lib/feed/schema.ts` (Zod).
Keep this doc and that schema in sync.

## Example

See [`examples/feed.sample.json`](./examples/feed.sample.json).

```json
{
  "schemaVersion": "1.0",
  "brand": "Recharge",
  "currency": "EUR",
  "generatedAt": "2026-06-10T08:00:00Z",
  "products": [
    {
      "externalId": "RC-WING-X",
      "name": "Wing-X Foil Wing",
      "descriptionHtml": "<p>High-aspect freeride wing…</p>",
      "vendor": "Recharge",
      "productType": "Wings",
      "status": "active",
      "tags": ["2026", "freeride"],
      "categoryPaths": ["Wings / Freeride"],
      "images": [{ "src": "https://recharge.si/img/wingx/hero.jpg", "alt": "Wing-X" }],
      "variants": [
        {
          "sku": "RC-WX-40",
          "barcode": "3830001234567",
          "option1": "4.0",
          "stock": 7,
          "price": { "amount": 899.0, "vat": 22, "taxMode": "gross" },
          "image": "https://recharge.si/img/wingx/40.jpg"
        }
      ]
    }
  ]
}
```

## Field reference

### Top level

| Field           | Required | Rules |
| --------------- | -------- | ----- |
| `schemaVersion` | ✅       | Must be the string `"1.0"`. |
| `brand`         | ✅       | Non-empty string. |
| `currency`      | ✅       | ISO-4217 3-letter code (e.g. `EUR`). |
| `generatedAt`   | ✅       | ISO-8601 timestamp with offset/UTC (e.g. `2026-06-10T08:00:00Z`). |
| `products`      | ✅       | Array (may be empty only if the source allows empty feeds). |

### `products[]`

| Field            | Required | Rules |
| ---------------- | -------- | ----- |
| `externalId`     | ✅       | Unique per feed — the parent's stable id. |
| `name`           | ✅       | Becomes the Shopify product title. |
| `descriptionHtml`| optional | HTML string. |
| `vendor`         | optional | |
| `productType`    | optional | |
| `status`         | optional | `active` \| `draft`. When omitted, the source's *Default status* applies. |
| `tags`           | optional | Array of strings. |
| `categoryPaths`  | optional | Array of `"A / B"` strings; expand to tags `A`, `A / B`. |
| `images`         | optional | Array of `{ src (https url), alt? }`. |
| `variants`       | ✅       | Array with **at least one** variant. |

### `products[].variants[]`

| Field     | Required | Rules |
| --------- | -------- | ----- |
| `sku`     | ✅       | **Globally unique per feed** — drives SKU → Shopify matching. |
| `barcode` | optional | |
| `option1` | optional | Variant value, e.g. size. |
| `stock`   | ✅       | Integer ≥ 0. |
| `price`   | ✅       | Object — see below. |
| `image`   | optional | https URL. |

### `price`

| Field     | Required | Rules |
| --------- | -------- | ----- |
| `amount`  | ✅       | Number ≥ 0. |
| `vat`     | ✅       | VAT percentage (number). |
| `taxMode` | ✅       | `gross` \| `net`. |

## Strictness notes

- **Unknown fields are rejected** (objects are `.strict()`). Don't send extra keys.
- `externalId` duplicates and `sku` duplicates are reported with both locations.
- A `400` from the test endpoint lists *every* issue at once, not just the first.
