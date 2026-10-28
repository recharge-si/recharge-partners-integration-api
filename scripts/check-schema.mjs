/**
 * Compares our copy of the feed contract (src/lib/feed/own-source.v1.json) with
 * the one the export portal serves. The portal's is canonical: it rejects any
 * feed that doesn't match it.
 *
 * Exit 0 ONLY when the two documents are identical. Every other outcome exits 1:
 * a difference (the first differing path is named), HTTP 404 or any non-2xx, a
 * timeout, a network error, a body that is not JSON. A check that did not
 * compare must never look like a pass.
 *
 *   npm run check:schema
 *   PORTAL_SCHEMA_URL=http://localhost:3000/api/export/schemas/own-source.v1.json npm run check:schema
 *
 * Env: PORTAL_SCHEMA_URL (default below), PORTAL_SCHEMA_TIMEOUT_MS (default 20000).
 */
import { readFile } from "node:fs/promises";

const DEFAULT_URL = "https://api.time-4-action.com/api/export/schemas/own-source.v1.json";
const fromEnv = process.env.PORTAL_SCHEMA_URL?.trim();
const url = fromEnv || DEFAULT_URL;
const timeoutMs = Number(process.env.PORTAL_SCHEMA_TIMEOUT_MS) || 20_000;

function fail(message) {
  console.error(`check:schema FAILED: ${message}`);
  process.exit(1);
}

/** Path of the first difference between two JSON values, or null when identical. */
function firstDiff(a, b, path = "$") {
  if (a === b) return null;
  const isObj = (v) => v !== null && typeof v === "object";
  if (!isObj(a) || !isObj(b) || Array.isArray(a) !== Array.isArray(b)) {
    return `${path} (ours: ${JSON.stringify(a)}, portal: ${JSON.stringify(b)})`;
  }
  const keys = Array.isArray(a)
    ? Array.from({ length: Math.max(a.length, b.length) }, (_, i) => i)
    : [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();
  for (const k of keys) {
    const sub = Array.isArray(a) ? `${path}[${k}]` : `${path}.${k}`;
    if (!(k in a)) return `${sub} (missing in ours, portal: ${JSON.stringify(b[k])})`;
    if (!(k in b)) return `${sub} (missing in portal, ours: ${JSON.stringify(a[k])})`;
    const d = firstDiff(a[k], b[k], sub);
    if (d) return d;
  }
  return null;
}

if (fromEnv) {
  console.log(`PORTAL_SCHEMA_URL is set; comparing with ${url}`);
} else {
  console.log(`PORTAL_SCHEMA_URL is not set; using the default ${url}`);
}

const ours = JSON.parse(await readFile(new URL("../src/lib/feed/own-source.v1.json", import.meta.url), "utf8"));

let res;
try {
  res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs), headers: { accept: "application/json" } });
} catch (err) {
  const timedOut = err?.name === "TimeoutError" || err?.name === "AbortError";
  fail(timedOut ? `${url} did not answer within ${timeoutMs} ms` : `could not reach ${url}: ${err?.cause?.code ?? err?.message ?? err}`);
}
if (!res.ok) {
  fail(
    res.status === 404
      ? `${url} returned 404; the portal does not publish the schema there (deploy the portal first). Nothing was compared.`
      : `${url} returned HTTP ${res.status}. Nothing was compared.`,
  );
}

let theirs;
try {
  theirs = JSON.parse(await res.text());
} catch {
  fail(`${url} did not return JSON. Nothing was compared.`);
}

const diff = firstDiff(ours, theirs);
if (diff) {
  fail(
    `src/lib/feed/own-source.v1.json differs from ${url}\n  first difference: ${diff}\n` +
      "Copy the portal's schema over ours, then update src/lib/feed/schema.ts (Zod) to match and run npm test.",
  );
}
console.log(`feed schema matches ${url}`);
