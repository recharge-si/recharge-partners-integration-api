import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mapPoint7, type RawExport } from "@/lib/sources/point7-map";
import { validateFeed } from "@/lib/feed/validate";

// A real POINT-7 export (public catalogue data), recorded once.
const raw = JSON.parse(readFileSync("test/fixtures/point7-export.json", "utf8")) as RawExport;

test("POINT-7 export maps to a feed the portal accepts", () => {
  const { feed, stats } = mapPoint7(raw);
  const r = validateFeed(feed);
  assert.equal(r.ok, true, JSON.stringify(r.issues.slice(0, 5)));
  assert.equal(stats.products, feed.products.length);
  assert.ok(feed.products.length > 0);
});

test("POINT-7 mapping is deterministic (synthetic OWN skus are stable)", () => {
  const a = mapPoint7(raw).feed.products.flatMap((p) => p.variants.map((v) => v.sku));
  const b = mapPoint7(raw).feed.products.flatMap((p) => p.variants.map((v) => v.sku));
  assert.deepEqual(a, b);
  assert.equal(new Set(a).size, a.length, "skus are unique");
});
