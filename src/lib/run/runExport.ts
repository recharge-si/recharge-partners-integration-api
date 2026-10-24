import { connectDB } from "@/lib/db/mongoose";
import { ImportRun } from "@/lib/models/ImportRun";
import { ExportSnapshot } from "@/lib/models/ExportSnapshot";
import { getSource, type PartnerSource } from "@/lib/sources/registry";
import { buildStandardFeed } from "@/lib/sources/builders";
import { validateFeed, type ValidationIssue } from "@/lib/feed/validate";
import type { Feed } from "@/lib/feed/schema";

export type Trigger = "manual" | "scheduled" | "test";

export type ExportResult = {
  status: "success" | "failed";
  counts: { products: number; variants: number };
  issues: ValidationIssue[];
  error: string | null;
  feedGeneratedAt: Date | null;
};

const ZERO = { products: 0, variants: 0 };

/**
 * Pull a source: build its standardized feed (bespoke code mapping), validate it
 * against our own contract, then STORE it (ExportSnapshot) so the export endpoint
 * serves it instantly, and records an ImportRun. `trigger === "test"` validates
 * only — no store, no history.
 *
 * This app never writes to Shopify. The export portal (t4a-partner-portal-api)
 * registers `/api/export/<id>` as an Own Source and does the Shopify push.
 *
 * Strict by design: a build error or validation failure aborts before any store
 * or write, so a broken mapping can never replace a good stored export.
 */
export async function runExport(sourceId: string, trigger: Trigger): Promise<ExportResult> {
  const source = getSource(sourceId);
  if (!source) throw new Error(`Unknown source "${sourceId}"`);

  const startedAt = new Date();
  const isTest = trigger === "test";

  // Mark the run as "running" up front so a reload (or another viewer) sees the
  // in-progress state even though the pull takes ~45s. Tests are not recorded.
  let runId: unknown = null;
  if (!isTest) {
    await connectDB();
    const run = await ImportRun.create({
      sourceId,
      trigger,
      status: "running",
      startedAt,
      counts: { ...ZERO },
      issues: [],
      error: null,
    });
    runId = run._id;
  }

  const { result, feed } = await execute(source);

  if (!isTest) {
    // Store the latest good feed so /api/export/<id> is instant.
    if (result.status === "success" && feed) {
      await ExportSnapshot.findOneAndUpdate(
        { sourceId },
        {
          sourceId,
          feed,
          products: result.counts.products,
          variants: result.counts.variants,
          generatedAt: result.feedGeneratedAt,
          builtAt: new Date(),
        },
        { upsert: true, new: true },
      );
    }

    // Finalise the run record.
    await ImportRun.findByIdAndUpdate(runId, {
      status: result.status,
      finishedAt: new Date(),
      feedGeneratedAt: result.feedGeneratedAt,
      counts: result.counts,
      issues: result.issues,
      error: result.error,
    });
  }

  return result;
}

async function execute(
  source: PartnerSource,
): Promise<{ result: ExportResult; feed: Feed | null }> {
  const fail = (error: string, extra: Partial<ExportResult> = {}): { result: ExportResult; feed: null } => ({
    result: { status: "failed", counts: { ...ZERO }, issues: [], error, feedGeneratedAt: null, ...extra },
    feed: null,
  });

  // 1. Build the standardized feed via the partner's code mapping.
  let raw: unknown;
  try {
    raw = await buildStandardFeed(source.id);
  } catch (err) {
    return fail((err as Error).message);
  }

  // 2. Validate against our own contract (dogfood the standard format).
  const validation = validateFeed(raw);
  if (!validation.ok) {
    return fail(`Built feed failed validation (${validation.issues.length} issue(s))`, {
      counts: { ...ZERO, products: validation.stats.products },
      issues: validation.issues,
    });
  }

  const feed = validation.data;
  const feedGeneratedAt = new Date(feed.generatedAt);
  const counts = {
    products: validation.stats.products,
    variants: validation.stats.variants,
  };

  // 3. Wipe-guard: never let an empty build replace a good export.
  if (feed.products.length === 0) {
    return {
      result: { status: "failed", counts, issues: [], error: "Built feed returned 0 products (wipe-guard).", feedGeneratedAt },
      feed: null,
    };
  }

  // 4. Valid. A test run stops here (the caller stores nothing for it).
  return {
    result: { status: "success", counts, issues: [], error: null, feedGeneratedAt },
    feed,
  };
}
