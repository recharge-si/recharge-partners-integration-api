import type { CsvRow } from "@/lib/sources/csv";
import type { Feed, FeedProduct, FeedVariant } from "@/lib/feed/schema";

/**
 * Pure Unifiber / Equipe Trading mapping (no network, no fs, no env) so it can be
 * unit-tested against the sample exports. The fetch+read wrapper lives in
 * `unifiber.ts`.
 *
 * The partner gives us TWO CSVs:
 *
 *  - **Stock export** — fetched live on every pull. This is the AUTHORITY for
 *    what exists and is sellable: which products, which variants, stock levels
 *    and retail prices. It is self-sufficient (name, price, EAN, image, category).
 *  - **Master export** — emailed, not hosted, so it ships hardcoded in `data/`.
 *    Pure ENRICHMENT: long descriptions, detail-image galleries and category
 *    paths. Anything it lacks simply isn't added; nothing depends on it.
 *
 * That split is deliberate: the master file goes stale between emails, so it must
 * never decide the catalogue. A product that appears in the live stock feed flows
 * through even when the master file has never heard of it (7 such rows today).
 *
 * Shape of the stock export — rows are variant-level with an explicit parent:
 *   - a PARENT row has the literal `"Parent"` in its `Parent Code` column and
 *     carries no stock or price; its `Code` is an id and its `Description` is the
 *     product name.
 *   - a CHILD row has `Parent Code` = the parent's `Code`, and its own `Code` is
 *     the real supplier SKU.
 * So the product/variant grouping is given to us — no guessing, unlike POINT-7.
 */

const VAT = 22;
const CURRENCY = "EUR";
const FEED_BRAND = "Unifiber";

/** Marker the partner puts in `Parent Code` to flag a row as a parent. */
const PARENT_MARKER = "Parent";

/** Cap on images per product, so a pathological master row can't explode a feed. */
const MAX_IMAGES = 25;

export type MapStats = {
  products: number;
  variants: number;
  /** Variants enriched by a matching master row. */
  enriched: number;
  /** Live SKUs the hardcoded master file does not know about (still exported). */
  missingFromMaster: number;
  /** Variants dropped for a €0 price — they are promo giveaways, not products. */
  skippedZeroPrice: number;
  /** Variants dropped because their SKU already appeared. */
  droppedDuplicates: number;
  /** Child rows whose parent row is missing (skipped — they have no product). */
  orphanRows: number;
  /** Products dropped because every variant was skipped. */
  emptyProducts: number;
};

/** Parse a price like "34.94" → number, or null when unusable/zero. */
function parsePrice(raw: string | undefined): number | null {
  if (!raw) return null;
  const n = Number(raw.trim().replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Parse a stock level like "84" → non-negative integer (0 when unusable). */
function parseStock(raw: string | undefined): number {
  const n = Number.parseInt((raw ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function validUrl(raw: string | undefined): string | undefined {
  const s = raw?.trim();
  if (!s) return undefined;
  return /^https?:\/\//i.test(s) ? s : undefined;
}

/**
 * The EAN column is sometimes filled with the supplier's own article code
 * (e.g. "UFS00000296") rather than a barcode. Only emit a real GTIN.
 */
function validBarcode(raw: string | undefined): string | undefined {
  const s = raw?.trim();
  return s && /^\d{8,14}$/.test(s) ? s : undefined;
}

/**
 * Strip the longest prefix shared by every description, backtracked to a word
 * boundary, leaving just the part that distinguishes each sibling.
 * ["Aeryn Foil Navigator 1300", "… 1500"] → ["1300", "1500"].
 */
function distinguishers(descriptions: string[]): string[] {
  if (descriptions.length < 2) return descriptions.map(() => "");

  let len = descriptions[0].length;
  for (const d of descriptions.slice(1)) {
    let i = 0;
    while (i < len && i < d.length && descriptions[0][i] === d[i]) i++;
    len = i;
  }
  // Backtrack to the last separator so we don't cut a word/number in half.
  while (len > 0 && !/[\s\-–—:,|/]/.test(descriptions[0][len - 1])) len--;

  return descriptions.map((d) => d.slice(len).replace(/^[\s\-–—:,|/]+/u, "").trim());
}

/** True when every entry is a non-empty, distinct string. */
function allDistinct(values: string[]): boolean {
  return values.every(Boolean) && new Set(values).size === values.length;
}

/**
 * Variant option labels for one product, guaranteed non-empty and unique so
 * Shopify can build a real option set.
 *
 * Size/Color alone is not enough: 86 products reuse one size across genuinely
 * different variants (three "Aeryn Foil Navigator" wings all tagged size 75), so
 * we fall back to what the descriptions disagree about, then to the SKU.
 */
function optionLabels(children: CsvRow[]): (string | undefined)[] {
  const sizeColor = children.map((c) => [c.Size, c.Color].filter(Boolean).join(" / "));

  // A single-variant product needs no option; keep size/colour if the partner
  // bothered to state one, otherwise leave it off.
  if (children.length === 1) return [sizeColor[0] || undefined];

  if (allDistinct(sizeColor)) return sizeColor;

  const descPart = distinguishers(children.map((c) => c.Description ?? ""));
  if (allDistinct(descPart)) return descPart;

  // Messy tail: take the best label available per variant, then force
  // uniqueness with the SKU (which is unique by construction).
  const seen = new Set<string>();
  return children.map((child, i) => {
    const base = descPart[i] || sizeColor[i] || child.Description || child.Code;
    const label = seen.has(base) ? `${base} (${child.Code})` : base;
    seen.add(label);
    return label;
  });
}

/** Category path from a master row: "Windsurf > Masts > RDM". */
function masterCategoryPath(row: CsvRow | undefined): string | undefined {
  if (!row) return undefined;
  const path = [
    row.Division,
    row["Category #1"],
    row["Category #2"],
    row["Category #3"],
    row["Category #4"],
    row["Category #5"],
  ]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(" > ");
  return path || undefined;
}

/** All image URLs a master row offers, hero first. */
function masterImages(row: CsvRow | undefined): string[] {
  if (!row) return [];
  const detail = Array.from({ length: 10 }, (_, i) => row[`Detail image #${i + 1}`]);
  return [row["Main image"], ...detail].map(validUrl).filter((u): u is string => Boolean(u));
}

export function mapUnifiber(stockRows: CsvRow[], masterRows: CsvRow[]): { feed: Feed; stats: MapStats } {
  const stats: MapStats = {
    products: 0,
    variants: 0,
    enriched: 0,
    missingFromMaster: 0,
    skippedZeroPrice: 0,
    droppedDuplicates: 0,
    orphanRows: 0,
    emptyProducts: 0,
  };

  const master = new Map<string, CsvRow>();
  for (const row of masterRows) {
    const sku = row.SKU?.trim();
    if (sku) master.set(sku, row);
  }

  // Split the stock export into parents (products) and children (variants).
  const parents = new Map<string, CsvRow>();
  const childRows: CsvRow[] = [];
  for (const row of stockRows) {
    const code = row.Code?.trim();
    if (!code) continue;
    if (row["Parent Code"]?.trim() === PARENT_MARKER) parents.set(code, row);
    else childRows.push(row);
  }

  // Group variants under their parent, preserving file order.
  const groups = new Map<string, CsvRow[]>();
  for (const child of childRows) {
    const parentCode = child["Parent Code"]?.trim();
    if (!parentCode || !parents.has(parentCode)) {
      stats.orphanRows++;
      continue;
    }
    const group = groups.get(parentCode) ?? [];
    group.push(child);
    groups.set(parentCode, group);
  }

  const seenSku = new Set<string>();
  const products: FeedProduct[] = [];

  for (const [parentCode, children] of groups) {
    const parent = parents.get(parentCode)!;

    // Label before filtering so labels stay stable regardless of what's dropped.
    const labels = optionLabels(children);

    const variants: FeedVariant[] = [];
    const keptMasterRows: CsvRow[] = [];

    children.forEach((child, i) => {
      const sku = child.Code.trim();

      const amount = parsePrice(child["Retail Price"]);
      if (amount == null) {
        stats.skippedZeroPrice++;
        return;
      }
      if (seenSku.has(sku)) {
        stats.droppedDuplicates++;
        return;
      }
      seenSku.add(sku);

      const masterRow = master.get(sku);
      if (masterRow) {
        stats.enriched++;
        keptMasterRows.push(masterRow);
      } else {
        stats.missingFromMaster++;
      }

      const option1 = labels[i];
      const barcode = validBarcode(child.EAN);
      const image = validUrl(masterRow?.["Main image"]) ?? validUrl(child.Image);

      variants.push({
        sku,
        ...(barcode ? { barcode } : {}),
        ...(option1 ? { option1 } : {}),
        stock: parseStock(child.Stock),
        price: { amount, vat: VAT, taxMode: "gross" },
        ...(image ? { image } : {}),
      });
    });

    if (variants.length === 0) {
      stats.emptyProducts++;
      continue;
    }

    // Name: the parent row is the product. Fall back to the master product name
    // (per-variant, so it may carry a size) and finally to the parent code.
    const name =
      parent.Description?.trim() ||
      keptMasterRows.find((m) => m["Product name"]?.trim())?.["Product name"]?.trim() ||
      children[0].Description?.trim() ||
      parentCode;

    const descriptionHtml = keptMasterRows.find((m) => m.Description?.trim())?.Description?.trim();

    // Gallery: every variant's hero shot (colourways differ), then the detail
    // images of the first enriched variant, then the parent's own photo.
    const heroShots = keptMasterRows
      .map((m) => validUrl(m["Main image"]))
      .filter((u): u is string => Boolean(u));
    const parentShot = validUrl(parent.Image);
    const images = [
      ...new Set([...heroShots, ...masterImages(keptMasterRows[0]), ...(parentShot ? [parentShot] : [])]),
    ].slice(0, MAX_IMAGES);

    const categoryPaths = [
      ...new Set(keptMasterRows.map(masterCategoryPath).filter((p): p is string => Boolean(p))),
    ];
    const stockPath = [parent["Main Category"], parent["Sub Category"]].filter(Boolean).join(" > ");
    if (categoryPaths.length === 0 && stockPath) categoryPaths.push(stockPath);

    const vendor = parent.Brand?.trim() || children[0].Brand?.trim();
    const productType = parent["Sub Category"]?.trim() || parent["Main Category"]?.trim();

    products.push({
      externalId: parentCode,
      name,
      ...(descriptionHtml ? { descriptionHtml } : {}),
      ...(vendor ? { vendor } : {}),
      ...(productType ? { productType } : {}),
      status: "active",
      ...(categoryPaths.length ? { categoryPaths } : {}),
      ...(images.length ? { images: images.map((src) => ({ src })) } : {}),
      variants,
    });

    stats.products++;
    stats.variants += variants.length;
  }

  const feed: Feed = {
    schemaVersion: "1.0",
    brand: FEED_BRAND,
    currency: CURRENCY,
    generatedAt: new Date().toISOString(),
    products,
  };

  return { feed, stats };
}
