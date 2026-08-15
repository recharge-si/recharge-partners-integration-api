import type { Feed } from "@/lib/feed/schema";
import { buildPoint7Feed } from "@/lib/sources/point7";
import { buildUnifiberFeed } from "@/lib/sources/unifiber";

/**
 * Per-partner feed builders: the bespoke code that turns a partner's native
 * export (x/y/z) into OUR standard feed format. This is the "complex mapping
 * behind the scenes" — it lives in code, not in any UI.
 *
 * A builder fetches/reads the partner's native data and returns a `Feed` object
 * that MUST satisfy `src/lib/feed/schema.ts`. The caller validates the result
 * against that schema (we dogfood our own contract), so a builder bug surfaces
 * as a validation error rather than a bad export.
 *
 * Add a partner: register its `id` here with a builder function.
 */
export type FeedBuilder = () => Promise<Feed>;

class BuilderNotImplementedError extends Error {}

export const BUILDERS: Record<string, FeedBuilder> = {
  "point-7": buildPoint7Feed,
  unifiber: buildUnifiberFeed,
  // patrik: <builder pending>
};

export function hasBuilder(id: string): boolean {
  return id in BUILDERS;
}

/** Build a source's standardized feed, or throw if no builder is registered. */
export async function buildStandardFeed(id: string): Promise<Feed> {
  const builder = BUILDERS[id];
  if (!builder) {
    throw new BuilderNotImplementedError(
      `No feed builder implemented for source "${id}" yet.`,
    );
  }
  return builder();
}

export { BuilderNotImplementedError };
