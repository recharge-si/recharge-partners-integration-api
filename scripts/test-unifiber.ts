/**
 * Unifiber mapping check — runs the REAL mapper and the REAL feed schema against
 * the live stock export (or a local CSV) plus the hardcoded master export, then
 * prints what came out.
 *
 *   npm run test:unifiber              # fetch the live stock export
 *   npm run test:unifiber -- <file>    # use a local stock CSV instead
 *
 * Add --json to dump the built feed to stdout.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseCsv } from "@/lib/sources/csv";
import { mapUnifiber } from "@/lib/sources/unifiber-map";
import { validateFeed } from "@/lib/feed/validate";

const STOCK_URL = "https://b2b.equipe-trading.com/export/58d250874eae3509321d5e41";
const MASTER = path.join(process.cwd(), "data", "unifiber-master.csv");

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const wantJson = process.argv.includes("--json");

async function loadStock(): Promise<string> {
  if (args[0]) {
    console.log(`stock: reading ${args[0]}`);
    return readFile(args[0], "utf8");
  }
  console.log(`stock: fetching ${STOCK_URL}`);
  const res = await fetch(STOCK_URL, { cache: "no-store", signal: AbortSignal.timeout(90_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  return res.text();
}

const started = Date.now();
const [stockCsv, masterCsv] = await Promise.all([loadStock(), readFile(MASTER, "utf8")]);

const stockRows = parseCsv(stockCsv);
const masterRows = parseCsv(masterCsv);
console.log(`parsed: ${stockRows.length} stock rows, ${masterRows.length} master rows\n`);

const { feed, stats } = mapUnifiber(stockRows, masterRows);
console.log("stats:", stats);

const result = validateFeed(feed);
if (!result.ok) {
  console.error(`\n✗ FAILED validation — ${result.issues.length} issue(s):`);
  for (const issue of result.issues.slice(0, 40)) {
    console.error(`  ${issue.path}: ${issue.message}`);
  }
  if (result.issues.length > 40) console.error(`  … and ${result.issues.length - 40} more`);
  process.exit(1);
}

console.log(`\n✓ valid — ${result.stats.products} products / ${result.stats.variants} variants`);

// A quick eyeball of what the mapping actually produced.
const multi = feed.products.filter((p) => p.variants.length > 1);
console.log(
  `\nproducts with >1 variant: ${multi.length} | ` +
    `with description: ${feed.products.filter((p) => p.descriptionHtml).length} | ` +
    `with images: ${feed.products.filter((p) => p.images?.length).length} | ` +
    `with category: ${feed.products.filter((p) => p.categoryPaths?.length).length}`,
);
const variants = feed.products.flatMap((p) => p.variants);
console.log(
  `variants with barcode: ${variants.filter((v) => v.barcode).length} | ` +
    `with option1: ${variants.filter((v) => v.option1).length} | ` +
    `in stock: ${variants.filter((v) => v.stock > 0).length} | ` +
    `total units: ${variants.reduce((n, v) => n + v.stock, 0)}`,
);

console.log("\nsample multi-variant products:");
for (const p of multi.slice(0, 5)) {
  console.log(`\n  ${p.name}  [${p.vendor} · ${p.productType}]  ${p.images?.length ?? 0} image(s)`);
  console.log(`    ${p.categoryPaths?.join(" | ") ?? "(no category)"}`);
  for (const v of p.variants.slice(0, 6)) {
    console.log(`    - ${v.sku.padEnd(14)} ${String(v.option1 ?? "—").padEnd(28)} €${v.price.amount}  stock ${v.stock}`);
  }
  if (p.variants.length > 6) console.log(`    … ${p.variants.length - 6} more`);
}

if (wantJson) {
  const out = path.join(process.cwd(), "unifiber-feed.json");
  await writeFile(out, JSON.stringify(feed, null, 2));
  console.log(`\nwrote ${out}`);
}

console.log(`\ndone in ${((Date.now() - started) / 1000).toFixed(1)}s`);
