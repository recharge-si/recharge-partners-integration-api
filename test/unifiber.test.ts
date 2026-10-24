import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseCsv } from "@/lib/sources/csv";
import { mapUnifiber } from "@/lib/sources/unifiber-map";
import { validateFeed } from "@/lib/feed/validate";

// The first rows of a real stock export, plus the master export the app ships with.
const stock = parseCsv(readFileSync("test/fixtures/unifiber-stock.sample.csv", "utf8"));
const master = parseCsv(readFileSync("data/unifiber-master.csv", "utf8"));

test("Unifiber exports map to a feed the portal accepts", () => {
  const { feed } = mapUnifiber(stock, master);
  const r = validateFeed(feed);
  assert.equal(r.ok, true, JSON.stringify(r.issues.slice(0, 5)));
  assert.ok(feed.products.length > 0);
});
