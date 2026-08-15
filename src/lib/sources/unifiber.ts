import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Feed } from "@/lib/feed/schema";
import { getEnv } from "@/env";
import { parseCsv, type CsvRow } from "@/lib/sources/csv";
import { mapUnifiber } from "@/lib/sources/unifiber-map";

/**
 * Unifiber / Equipe Trading feed builder — fetch the live stock export, read the
 * hardcoded master export, then map. The pure mapping lives in `unifiber-map.ts`
 * (testable without network or fs).
 */

/**
 * Equipe Trading's public stock export. Unlike POINT-7 this URL carries no
 * secret — it is a stable per-customer export link the partner told us is always
 * reachable — so it is defaulted here rather than required in `.env`. Override
 * with `UNIFIBER_STOCK_URL` if they ever reissue it.
 */
const DEFAULT_STOCK_URL = "https://b2b.equipe-trading.com/export/58d250874eae3509321d5e41";

/**
 * The master export is EMAILED, not hosted, so it ships with the repo. Replace
 * this file when the partner sends a new one — nothing else needs to change.
 */
const MASTER_CSV_PATH = path.join(process.cwd(), "data", "unifiber-master.csv");

/** Cached master rows — the file is ~4 MB and never changes at runtime. */
let masterCache: CsvRow[] | null = null;

async function readMaster(): Promise<CsvRow[]> {
  if (masterCache) return masterCache;
  try {
    const csv = await readFile(MASTER_CSV_PATH, "utf8");
    masterCache = parseCsv(csv);
  } catch (err) {
    throw new Error(
      `Could not read the Unifiber master export at ${MASTER_CSV_PATH}: ${(err as Error).message}`,
    );
  }
  return masterCache;
}

async function fetchStock(): Promise<CsvRow[]> {
  const url = getEnv().UNIFIBER_STOCK_URL || DEFAULT_STOCK_URL;

  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(90_000) });
  if (!res.ok) {
    throw new Error(`Unifiber stock export returned HTTP ${res.status} ${res.statusText}`);
  }

  const body = await res.text();
  // A redirect to the B2B login serves HTML with a 200 — catch that rather than
  // letting the parser produce a confidently empty feed.
  if (/^\s*</.test(body)) {
    throw new Error(
      "Unifiber stock export returned HTML, not CSV — the export link is probably no longer valid.",
    );
  }

  return parseCsv(body);
}

export async function buildUnifiberFeed(): Promise<Feed> {
  const [stockRows, masterRows] = await Promise.all([fetchStock(), readMaster()]);

  const { feed, stats } = mapUnifiber(stockRows, masterRows);
  console.log(
    `[unifiber] mapped ${stats.products} products / ${stats.variants} variants ` +
      `(${stats.enriched} enriched from master, ${stats.missingFromMaster} not in master, ` +
      `${stats.skippedZeroPrice} zero-price skipped, ${stats.droppedDuplicates} dup skus dropped, ` +
      `${stats.orphanRows} orphan rows, ${stats.emptyProducts} empty products)`,
  );
  return feed;
}
