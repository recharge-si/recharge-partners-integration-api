import type { Feed } from "@/lib/feed/schema";
import type { PartnerSource } from "@/lib/sources/registry";
import { isShopifyConfigured } from "@/env";

export type SyncCounts = {
  created: number;
  updated: number;
  removed: number;
};

/**
 * Push a validated feed to Shopify (one-way sync, SKU-matched).
 *
 * STATUS: NOT IMPLEMENTED. This is the core remaining work — see
 * docs/ROADMAP.md → "Shopify sync".
 *
 * Intended behaviour:
 *   1. For each variant, match by SKU to an existing Shopify variant.
 *   2. Create products/variants that don't exist; update price/stock/fields on
 *      those that do. Respect `source.importOptions.defaultStatus`.
 *   3. Apply `removalPolicy` (delist | zero_stock | keep) to products that were
 *      in Shopify (from this source) but dropped out of the feed.
 *   4. Never partially apply: validate everything first (already done upstream),
 *      then write. Return accurate created/updated/removed counts.
 *
 * Until implemented, when Shopify IS configured this throws so we never silently
 * claim success. When Shopify is NOT configured, runImport takes the dry-run
 * path and never calls this.
 */
export async function syncFeedToShopify(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _source: PartnerSource,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _feed: Feed,
): Promise<SyncCounts> {
  if (!isShopifyConfigured()) {
    // Caller (runImport) should have chosen the dry-run path; guard anyway.
    throw new Error("syncFeedToShopify called without Shopify configured");
  }
  throw new Error(
    "Shopify sync not implemented yet — see docs/ROADMAP.md. Imports run as dry-runs until this lands.",
  );
}

/**
 * Dry-run planner used when Shopify is not configured: reports what WOULD change
 * without writing anything. Currently treats every feed product as "created" so
 * the dashboard shows feed size; refine once real diffing exists.
 */
export function planDryRun(feed: Feed): SyncCounts {
  return { created: feed.products.length, updated: 0, removed: 0 };
}
