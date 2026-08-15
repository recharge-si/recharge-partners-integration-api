import { createHash } from "node:crypto";
import type { Feed, FeedProduct, FeedVariant } from "@/lib/feed/schema";

/**
 * Pure POINT-7 mapping (no network, no env) so it can be unit-tested against a
 * snapshot. The fetch wrapper lives in `point7.ts`.
 *
 * Native rows are variant-level; rows sharing `id` are variants of one product.
 *
 * SKU handling (per product owner): we need ALL products, so we never drop a
 * distinct variant for lacking a SKU. Instead:
 *   - real `sku` present  → use it.
 *   - `sku` empty         → synthesize a STABLE `OWN<hash>` SKU from the row's
 *                           identity (id|name|type|ean).
 *   - final SKU already seen → drop (this collapses true 1:1 duplicates, which
 *                           hash to the same synthetic SKU, and any real dup).
 * Rows with no usable price are skipped (our schema requires a price); a product
 * is only dropped if it ends up with zero variants.
 */

const VAT = 22;
const CURRENCY = "EUR";

/**
 * ⚠️ POINT-7 only reports "available" vs "not", never a quantity. We represent
 * availability as this many units. Tune, or let the Shopify sync set a policy.
 */
const STOCK_WHEN_AVAILABLE = 10;

export type RawItem = {
  name?: string;
  type?: string;
  description?: string;
  image?: string;
  "image medium"?: string;
  id?: number | string;
  sku?: string;
  ean?: string;
  "eu rrp +vat"?: string;
  inventory?: string;
};

export type RawExport = Record<string, RawItem[]>;

export type MapStats = {
  products: number;
  variants: number;
  syntheticSkus: number;
  droppedDuplicates: number;
  skippedNoPrice: number;
};

/** Parse a price like "899", "56,56", " 1.189 " → number, or null if unusable. */
function parsePrice(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function validUrl(raw: string | undefined): string | undefined {
  const s = raw?.trim();
  if (!s) return undefined;
  return /^https?:\/\//i.test(s) ? s : undefined;
}

/** Stable synthetic SKU for rows the supplier left without one. */
function syntheticSku(item: RawItem): string {
  const identity = [item.id ?? "", item.name?.trim() ?? "", item.type?.trim() ?? "", item.ean?.trim() ?? ""].join("|");
  const hash = createHash("sha1").update(identity).digest("hex").slice(0, 10).toUpperCase();
  return `OWN${hash}`;
}

const TYPE_BY_CATEGORY: Record<string, string> = {
  parts: "Parts",
  components: "Components",
  apparel: "Apparel",
  bags: "Bags",
  sails: "Sails",
  "": "Sails",
};

/** Longest common prefix of the variant names, cleaned of trailing separators. */
function productName(names: string[]): string {
  const uniq = [...new Set(names)];
  if (uniq.length === 1) return uniq[0];
  let prefix = uniq[0];
  for (const n of uniq.slice(1)) {
    let i = 0;
    while (i < prefix.length && i < n.length && prefix[i] === n[i]) i++;
    prefix = prefix.slice(0, i);
  }
  const cleaned = prefix.replace(/[\s\-|/]+$/u, "").trim();
  return cleaned.length >= 3 ? cleaned : uniq.sort((a, b) => a.length - b.length)[0];
}

export function mapPoint7(raw: RawExport): { feed: Feed; stats: MapStats } {
  const stats: MapStats = {
    products: 0,
    variants: 0,
    syntheticSkus: 0,
    droppedDuplicates: 0,
    skippedNoPrice: 0,
  };

  // Group rows by product id, remembering each group's category.
  const groups = new Map<string, { category: string; items: RawItem[] }>();
  for (const [category, items] of Object.entries(raw)) {
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      const id = item.id != null ? String(item.id) : "";
      if (!id) continue;
      const g = groups.get(id) ?? { category, items: [] };
      g.items.push(item);
      groups.set(id, g);
    }
  }

  const seenSku = new Set<string>();
  const products: FeedProduct[] = [];

  for (const [id, { category, items }] of groups) {
    const variants: FeedVariant[] = [];

    for (const item of items) {
      const amount = parsePrice(item["eu rrp +vat"]);
      if (amount == null) {
        stats.skippedNoPrice++;
        continue;
      }

      const realSku = item.sku?.trim();
      const sku = realSku || syntheticSku(item);
      if (!realSku) stats.syntheticSkus++;

      if (seenSku.has(sku)) {
        // Same real SKU again, or a 1:1 duplicate row (same synthetic SKU).
        stats.droppedDuplicates++;
        if (!realSku) stats.syntheticSkus--; // it wasn't actually emitted
        continue;
      }
      seenSku.add(sku);

      const option1 = item.type?.trim();
      const barcode = item.ean?.trim();
      const image = validUrl(item.image);

      variants.push({
        sku,
        ...(barcode ? { barcode } : {}),
        ...(option1 ? { option1 } : {}),
        stock: item.inventory?.trim() === "1" ? STOCK_WHEN_AVAILABLE : 0,
        price: { amount, vat: VAT, taxMode: "gross" },
        ...(image ? { image } : {}),
      });
    }

    if (variants.length === 0) continue; // no usable variants → drop product

    const names = items.map((i) => i.name?.trim()).filter((n): n is string => Boolean(n));
    const name = names.length ? productName(names) : `POINT-7 ${id}`;
    const description = items.find((i) => i.description?.trim())?.description?.trim();
    const heroImage = items.map((i) => validUrl(i.image)).find(Boolean);

    products.push({
      externalId: id,
      name,
      ...(description ? { descriptionHtml: description } : {}),
      vendor: "POINT-7",
      productType: TYPE_BY_CATEGORY[category] ?? "Windsurf",
      status: "active",
      ...(heroImage ? { images: [{ src: heroImage }] } : {}),
      variants,
    });

    stats.products++;
    stats.variants += variants.length;
  }

  const feed: Feed = {
    schemaVersion: "1.0",
    brand: "POINT-7",
    currency: CURRENCY,
    generatedAt: new Date().toISOString(),
    products,
  };

  return { feed, stats };
}
