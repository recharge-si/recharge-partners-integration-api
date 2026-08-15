/**
 * Tiny Node resolve hook so `scripts/*.ts` can import the app's real modules the
 * way the app writes them — via the `@/…` alias (tsconfig `paths`) and without
 * file extensions — with no bundler or ts-node involved.
 *
 * Usage: node --experimental-strip-types --import ./scripts/alias-loader.mjs script.ts
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";

const hook = `
  import { existsSync } from "node:fs";
  import { fileURLToPath } from "node:url";

  const SRC = ${JSON.stringify(pathToFileURL(process.cwd().replace(/\\/g, "/") + "/src/").href)};
  const EXTENSIONS = [".ts", ".tsx", "/index.ts", "/index.tsx"];

  /** First candidate that exists on disk, else null. */
  function onDisk(baseUrl) {
    for (const suffix of ["", ...EXTENSIONS]) {
      const candidate = baseUrl + suffix;
      try {
        if (existsSync(fileURLToPath(candidate))) return candidate;
      } catch {}
    }
    return null;
  }

  export async function resolve(specifier, context, nextResolve) {
    // "@/lib/foo" -> "<cwd>/src/lib/foo(.ts)"
    if (specifier.startsWith("@/")) {
      const base = new URL(specifier.slice(2), SRC).href;
      return nextResolve(onDisk(base) ?? base, context);
    }

    // "./schema" -> "./schema.ts" (TS source omits the extension)
    if (specifier.startsWith(".") && context.parentURL) {
      const base = new URL(specifier, context.parentURL).href;
      const found = onDisk(base);
      if (found) return nextResolve(found, context);
    }

    return nextResolve(specifier, context);
  }
`;

register("data:text/javascript," + encodeURIComponent(hook), import.meta.url);
