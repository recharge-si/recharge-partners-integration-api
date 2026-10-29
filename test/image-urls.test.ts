import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateFeed } from "@/lib/feed/validate";
import { mapPoint7, type RawExport } from "@/lib/sources/point7-map";
import { mapUnifiber } from "@/lib/sources/unifiber-map";
import { parseCsv } from "@/lib/sources/csv";

// https-only image URLs. The portal's feedValidator.service.js refuses anything that
// does not match /^https:\/\//i; these tests pin the same behaviour on this side.

const sample = () => JSON.parse(readFileSync("docs/examples/feed.sample.json", "utf8"));

test("a feed with only https image urls passes", () => {
  const feed = sample();
  feed.products[0].images = [{ src: "https://cdn.example/a.jpg" }];
  feed.products[0].variants[0].image = "https://cdn.example/v.jpg";
  assert.equal(validateFeed(feed).ok, true);
});

test("an http product image fails at its path and the message says https", () => {
  const feed = sample();
  feed.products[0].images = [{ src: "http://cdn.example/a.jpg" }];
  const r = validateFeed(feed);
  assert.equal(r.ok, false);
  assert.ok(
    r.issues.some((i) => i.path === "products[0].images[0].src" && i.message.includes("https")),
    JSON.stringify(r.issues),
  );
});

test("an http variant image fails at its path and the message says https", () => {
  const feed = sample();
  feed.products[0].variants[0].image = "http://cdn.example/v.jpg";
  const r = validateFeed(feed);
  assert.equal(r.ok, false);
  assert.ok(
    r.issues.some((i) => i.path === "products[0].variants[0].image" && i.message.includes("https")),
    JSON.stringify(r.issues),
  );
});

test("protocol-relative and empty image urls fail", () => {
  for (const bad of ["//cdn.example/a.jpg", ""]) {
    const feed = sample();
    feed.products[0].images = [{ src: bad }];
    const r = validateFeed(feed);
    assert.equal(r.ok, false, `src=${JSON.stringify(bad)}`);
    assert.ok(r.issues.some((i) => i.path === "products[0].images[0].src"), JSON.stringify(r.issues));
  }
  const feed = sample();
  feed.products[0].variants[0].image = "";
  assert.equal(validateFeed(feed).ok, false);
});

test("pinned: an upper-case scheme (HTTPS://) is accepted, like the portal's case-insensitive check", () => {
  const feed = sample();
  feed.products[0].images = [{ src: "HTTPS://cdn.example/a.jpg" }];
  feed.products[0].variants[0].image = "HTTPS://cdn.example/v.jpg";
  assert.equal(validateFeed(feed).ok, true);
});

// --- builders: recorded inputs only, no partner calls ---

function imageUrls(feed: { products: Array<{ images?: Array<{ src: string }>; variants: Array<{ image?: string }> }> }) {
  return feed.products.flatMap((p) => [
    ...(p.images ?? []).map((i) => i.src),
    ...p.variants.flatMap((v) => (v.image ? [v.image] : [])),
  ]);
}

test("POINT-7 recorded export yields only https images and still validates", () => {
  const raw = JSON.parse(readFileSync("test/fixtures/point7-export.json", "utf8")) as RawExport;
  const { feed } = mapPoint7(raw);
  const urls = imageUrls(feed);
  assert.ok(urls.length > 0);
  assert.ok(urls.every((u) => /^https:\/\//i.test(u)));
  assert.equal(validateFeed(feed).ok, true);
});

test("POINT-7 drops an http image instead of failing the whole feed", () => {
  const raw = JSON.parse(readFileSync("test/fixtures/point7-export.json", "utf8")) as RawExport;
  const text = JSON.stringify(raw).replaceAll("https://point-7.com", "http://point-7.com").replaceAll("https:\\/\\/point-7.com", "http://point-7.com");
  const { feed } = mapPoint7(JSON.parse(text) as RawExport);
  assert.equal(imageUrls(feed).length, 0);
  assert.equal(validateFeed(feed).ok, true);
});

test("Unifiber recorded inputs yield only https images and still validate", () => {
  const stock = parseCsv(readFileSync("test/fixtures/unifiber-stock.sample.csv", "utf8"));
  const master = parseCsv(readFileSync("data/unifiber-master.csv", "utf8"));
  const { feed } = mapUnifiber(stock, master);
  const urls = imageUrls(feed);
  assert.ok(urls.length > 0);
  assert.ok(urls.every((u) => /^https:\/\//i.test(u)));
  assert.equal(validateFeed(feed).ok, true);
});
