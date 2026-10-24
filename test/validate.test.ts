import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateFeed } from "@/lib/feed/validate";

const sample = () => JSON.parse(readFileSync("docs/examples/feed.sample.json", "utf8"));

test("the documented sample feed is valid", () => {
  const r = validateFeed(sample());
  assert.equal(r.ok, true, JSON.stringify(r.issues));
  assert.ok(r.stats.products > 0 && r.stats.variants >= r.stats.products);
});

test("a field the portal doesn't know rejects the feed, with its path", () => {
  const feed = sample();
  feed.products[0].variants[0].colour = "red";
  const r = validateFeed(feed);
  assert.equal(r.ok, false);
  assert.ok(r.issues.some((i) => i.path === "products[0].variants[0]" && i.message.includes("colour")), JSON.stringify(r.issues));
});

test("a missing sku and a negative stock are reported at their exact paths", () => {
  const feed = sample();
  delete feed.products[0].variants[0].sku;
  feed.products[0].variants[1].stock = -1;
  const paths = validateFeed(feed).issues.map((i) => i.path);
  assert.ok(paths.includes("products[0].variants[0]"), paths.join());
  assert.ok(paths.includes("products[0].variants[1].stock"), paths.join());
});

test("an unsupported schemaVersion is rejected", () => {
  const r = validateFeed({ ...sample(), schemaVersion: "2.0" });
  assert.equal(r.ok, false);
  assert.ok(r.issues.some((i) => i.path === "schemaVersion"));
});

test("duplicate skus are rejected (Zod pass)", () => {
  const feed = sample();
  feed.products[0].variants[1].sku = feed.products[0].variants[0].sku;
  const r = validateFeed(feed);
  assert.equal(r.ok, false);
  assert.ok(r.issues.some((i) => i.message.startsWith("Duplicate sku")), JSON.stringify(r.issues));
});

test("non-objects never throw", () => {
  for (const input of [null, 42, "feed", []]) assert.equal(validateFeed(input).ok, false);
});
