/**
 * Compares our copy of the feed contract (src/lib/feed/own-source.v1.json) with
 * the one the export portal serves. The portal's is canonical: it rejects any
 * feed that doesn't match it. Exits 1 when they differ.
 *
 *   npm run check:schema
 *   PORTAL_SCHEMA_URL=http://localhost:3000/api/export/schemas/own-source.v1.json npm run check:schema
 */
import { readFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";

const url =
  process.env.PORTAL_SCHEMA_URL ??
  "https://api.time-4-action.com/api/export/schemas/own-source.v1.json";
const ours = JSON.parse(await readFile(new URL("../src/lib/feed/own-source.v1.json", import.meta.url), "utf8"));

const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
if (res.status === 404) {
  // The portal only serves the schema from the release that added the route.
  console.warn(`warning: ${url} returned 404; the portal doesn't publish the schema yet. Not compared.`);
  process.exit(0);
}
if (!res.ok) {
  console.error(`could not fetch ${url}: HTTP ${res.status}`);
  process.exit(1);
}
const theirs = await res.json();

if (!isDeepStrictEqual(ours, theirs)) {
  console.error(
    `src/lib/feed/own-source.v1.json differs from ${url}.\n` +
      "Copy the portal's schema over ours, then update src/lib/feed/schema.ts (Zod) to match and run npm test.",
  );
  process.exit(1);
}
console.log(`feed schema matches ${url}`);
