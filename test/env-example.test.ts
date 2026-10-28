import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// .env.example must list every variable src/env.ts reads, and CLAUDE.md must name them too.

const envTs = readFileSync("src/env.ts", "utf8");
const schemaBody = envTs.slice(envTs.indexOf("z.object({"), envTs.indexOf("export type Env"));
const names = [...schemaBody.matchAll(/^\s{2}([A-Z][A-Z0-9_]+):/gm)].map((m) => m[1]);

test("src/env.ts parsing finds the variables", () => {
  assert.ok(names.includes("MONGO_URI") && names.includes("POINT7_FEED_URL"), names.join());
});

test(".env.example exists and lists every variable src/env.ts reads", () => {
  const example = readFileSync(".env.example", "utf8");
  const listed = new Set([...example.matchAll(/^([A-Z][A-Z0-9_]+)=/gm)].map((m) => m[1]));
  const missing = names.filter((n) => !listed.has(n));
  assert.deepEqual(missing, [], `missing from .env.example: ${missing.join(", ")}`);
});

test(".env.example carries no secret values", () => {
  const example = readFileSync(".env.example", "utf8");
  assert.doesNotMatch(example, /token=[^\s&]+/i);
  assert.match(example, /^POINT7_FEED_URL=$/m);
  assert.match(example, /^CRON_SECRET=$/m);
});

test("CLAUDE.md documents every env var and PORTAL_SCHEMA_URL", () => {
  const doc = readFileSync("CLAUDE.md", "utf8");
  for (const n of [...names.filter((x) => x !== "NODE_ENV"), "PORTAL_SCHEMA_URL", "PORTAL_SCHEMA_TIMEOUT_MS"]) {
    assert.ok(doc.includes(n), `${n} not in CLAUDE.md`);
  }
});

test("the CI workflow gates on check with always() so a skipped check cannot pass", () => {
  const wf = readFileSync(".github/workflows/deploy.yml", "utf8");
  assert.match(wf, /gate:\s*\n\s+needs: check\s*\n\s+if: always\(\)/);
  assert.match(wf, /needs\.check\.result[^\n]*success/);
  assert.match(wf, /deploy:\s*\n\s+needs: \[check, gate\]/);
  assert.match(wf, /- run: npm run check:schema/);
});
