import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execFile } from "node:child_process";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

// scripts/check-schema.mjs must exit 0 only after a real, identical comparison.
// A throwaway local server stands in for the portal; it is closed inside each test.
// No live portal is ever contacted.

const ours = readFileSync("src/lib/feed/own-source.v1.json", "utf8");

type Reply = (res: import("node:http").ServerResponse) => void;

async function run(reply: Reply, env: Record<string, string> = {}) {
  const server: Server = createServer((_req, res) => reply(res));
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as AddressInfo;
  try {
    return await new Promise<{ code: number; out: string }>((resolve) => {
      execFile(
        process.execPath,
        ["scripts/check-schema.mjs"],
        { env: { ...process.env, PORTAL_SCHEMA_URL: `http://127.0.0.1:${port}/schema.json`, ...env } },
        (err, stdout, stderr) => {
          const code = err ? (err as { code?: unknown }).code : 0;
          resolve({ code: typeof code === "number" ? code : 1, out: stdout + stderr });
        },
      );
    });
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
}

const json = (body: string): Reply => (res) => {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(body);
};

test("identical schema exits 0", async () => {
  const r = await run(json(ours));
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /matches/);
});

test("same content with different key order and whitespace exits 0", async () => {
  const doc = JSON.parse(ours) as Record<string, unknown>;
  const reordered = Object.fromEntries(Object.entries(doc).reverse());
  const r = await run(json(JSON.stringify(reordered, null, 4)));
  assert.equal(r.code, 0, r.out);
});

test("404 exits non-zero", async () => {
  const r = await run((res) => {
    res.writeHead(404);
    res.end("nope");
  });
  assert.notEqual(r.code, 0);
  assert.match(r.out, /404/);
});

test("500 exits non-zero", async () => {
  const r = await run((res) => {
    res.writeHead(500);
    res.end();
  });
  assert.notEqual(r.code, 0);
});

test("timeout exits non-zero", async () => {
  const r = await run(() => {}, { PORTAL_SCHEMA_TIMEOUT_MS: "300" });
  assert.notEqual(r.code, 0);
  assert.match(r.out, /did not answer within 300 ms/);
});

test("a body that is not JSON exits non-zero", async () => {
  const r = await run(json("<html>not json</html>"));
  assert.notEqual(r.code, 0);
  assert.match(r.out, /did not return JSON/);
});

test("one differing property exits non-zero and names the first differing path", async () => {
  const doc = JSON.parse(ours) as { properties: { currency: { minLength?: number; maxLength?: number } } };
  const before = JSON.stringify(doc.properties.currency);
  doc.properties.currency = { ...doc.properties.currency, maxLength: 99 };
  assert.notEqual(JSON.stringify(doc.properties.currency), before);
  const r = await run(json(JSON.stringify(doc)));
  assert.notEqual(r.code, 0);
  assert.match(r.out, /first difference: \$\.properties\.currency\.maxLength/);
});

test("without PORTAL_SCHEMA_URL it prints the default URL it uses", async () => {
  const r = await new Promise<{ code: number; out: string }>((resolve) => {
    const env = { ...process.env };
    delete env.PORTAL_SCHEMA_URL;
    // fetch is stubbed out in the child, so the default (live) URL is never contacted.
    const noNetwork = "data:text/javascript,globalThis.fetch=async()=>{throw new Error('network blocked')}";
    execFile(process.execPath, ["--import", noNetwork, "scripts/check-schema.mjs"], { env }, (err, stdout, stderr) =>
      resolve({ code: err ? 1 : 0, out: stdout + stderr }),
    );
  });
  assert.match(r.out, /PORTAL_SCHEMA_URL is not set; using the default https:\/\/api\.time-4-action\.com\/api\/export\/schemas\/own-source\.v1\.json/);
  assert.equal(r.code, 1);
});
