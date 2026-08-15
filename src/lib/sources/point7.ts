import type { Feed } from "@/lib/feed/schema";
import { getEnv } from "@/env";
import { mapPoint7, type RawExport } from "@/lib/sources/point7-map";

/**
 * POINT-7 ("The Darkside of Windsurf") feed builder — fetch + map.
 * The pure mapping lives in `point7-map.ts` (testable without network/env).
 */
export async function buildPoint7Feed(): Promise<Feed> {
  const url = getEnv().POINT7_FEED_URL;
  if (!url) {
    throw new Error("POINT7_FEED_URL is not set — add the POINT-7 export URL (with token) to .env");
  }

  // POINT-7's export is large and the server can be slow — allow up to 90s.
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(90_000) });
  if (!res.ok) {
    throw new Error(`POINT-7 feed returned HTTP ${res.status} ${res.statusText}`);
  }
  const raw = (await res.json()) as RawExport;

  const { feed, stats } = mapPoint7(raw);
  console.log(
    `[point-7] mapped ${stats.products} products / ${stats.variants} variants ` +
      `(${stats.syntheticSkus} synthetic OWN skus, ${stats.droppedDuplicates} dup rows dropped, ` +
      `${stats.skippedNoPrice} no-price skipped)`,
  );
  return feed;
}
