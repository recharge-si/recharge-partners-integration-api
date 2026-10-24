import { connectDB } from "@/lib/db/mongoose";
import { ImportRun } from "@/lib/models/ImportRun";
import { ExportSnapshot } from "@/lib/models/ExportSnapshot";
import { SOURCES, getSource, exportPath, type PartnerSource } from "@/lib/sources/registry";
import { hasBuilder } from "@/lib/sources/builders";

/**
 * Read helpers for the read-only portal UI. Sources come from the CODE registry;
 * we enrich them with the latest run (health) from MongoDB. Everything returned
 * is plain & serialisable for the RSC boundary.
 */

/** A run older than this still marked "running" is treated as dead (not running). */
const RUNNING_TTL_MS = 5 * 60 * 1000;

export type LastRun = {
  status: "running" | "success" | "failed";
  at: string;
  products: number;
  variants: number;
};

export type Snapshot = {
  builtAt: string;
  products: number;
  variants: number;
};

export type SourceListItem = PartnerSource & {
  exportPath: string;
  hasBuilder: boolean;
  lastRun: LastRun | null;
  snapshot: Snapshot | null;
  running: boolean; // a pull is currently in progress
};

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
function isRunning(latestRunDoc: any | null): boolean {
  if (!latestRunDoc || latestRunDoc.status !== "running") return false;
  return Date.now() - new Date(latestRunDoc.startedAt).getTime() < RUNNING_TTL_MS;
}

export type ImportRunDTO = {
  id: string;
  trigger: "manual" | "scheduled" | "test";
  status: "running" | "success" | "failed";
  startedAt: string;
  finishedAt: string | null;
  feedGeneratedAt: string | null;
  counts: { products: number; variants: number };
  issues: { path: string; message: string }[];
  error: string | null;
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function toLastRun(doc: any | null): LastRun | null {
  if (!doc) return null;
  return {
    status: doc.status,
    at: new Date(doc.startedAt).toISOString(),
    products: doc.counts?.products ?? 0,
    variants: doc.counts?.variants ?? 0,
  };
}

function toRunDTO(doc: any): ImportRunDTO {
  return {
    id: String(doc._id),
    trigger: doc.trigger,
    status: doc.status,
    startedAt: new Date(doc.startedAt).toISOString(),
    finishedAt: doc.finishedAt ? new Date(doc.finishedAt).toISOString() : null,
    feedGeneratedAt: doc.feedGeneratedAt ? new Date(doc.feedGeneratedAt).toISOString() : null,
    counts: {
      products: doc.counts?.products ?? 0,
      variants: doc.counts?.variants ?? 0,
    },
    issues: (doc.issues ?? []).map((i: any) => ({ path: i.path, message: i.message })),
    error: doc.error ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* eslint-disable @typescript-eslint/no-explicit-any */
function toSnapshot(doc: any | null): Snapshot | null {
  if (!doc) return null;
  return {
    builtAt: new Date(doc.builtAt).toISOString(),
    products: doc.products ?? 0,
    variants: doc.variants ?? 0,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** All registry sources, each enriched with its most recent run + stored snapshot. */
export async function listSourcesWithHealth(): Promise<SourceListItem[]> {
  let latestById = new Map<string, unknown>();
  let snapById = new Map<string, unknown>();
  try {
    await connectDB();
    const [latest, snaps] = await Promise.all([
      ImportRun.aggregate([
        { $sort: { startedAt: -1 } },
        { $group: { _id: "$sourceId", doc: { $first: "$$ROOT" } } },
      ]),
      ExportSnapshot.find().lean(),
    ]);
    latestById = new Map(latest.map((r) => [r._id as string, r.doc]));
    snapById = new Map(snaps.map((s) => [s.sourceId, s]));
  } catch {
    // DB unreachable → render sources without health rather than failing.
  }

  return SOURCES.map((s) => {
    const latest = latestById.get(s.id) ?? null;
    return {
      ...s,
      exportPath: exportPath(s.id),
      hasBuilder: hasBuilder(s.id),
      lastRun: toLastRun(latest),
      snapshot: toSnapshot(snapById.get(s.id) ?? null),
      running: isRunning(latest),
    };
  });
}

export async function getSourceItem(id: string): Promise<SourceListItem | null> {
  const s = getSource(id);
  if (!s) return null;
  let snap: unknown = null;
  let latest: unknown = null;
  try {
    await connectDB();
    [snap, latest] = await Promise.all([
      ExportSnapshot.findOne({ sourceId: id }).lean(),
      ImportRun.findOne({ sourceId: id }).sort({ startedAt: -1 }).lean(),
    ]);
  } catch {
    /* DB unreachable */
  }
  return {
    ...s,
    exportPath: exportPath(s.id),
    hasBuilder: hasBuilder(s.id),
    lastRun: toLastRun(latest),
    snapshot: toSnapshot(snap),
    running: isRunning(latest),
  };
}

export async function listRuns(sourceId: string, limit = 25): Promise<ImportRunDTO[]> {
  await connectDB();
  const docs = await ImportRun.find({ sourceId }).sort({ startedAt: -1 }).limit(limit).lean();
  return docs.map(toRunDTO);
}
