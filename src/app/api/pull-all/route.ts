import { NextResponse } from "next/server";
import { SOURCES } from "@/lib/sources/registry";
import { runExport } from "@/lib/run/runExport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// POST /api/pull-all — pull every non-disabled source (sequentially, isolated).
export async function POST() {
  const sources = SOURCES.filter((s) => s.status !== "disabled");
  const results: { id: string; status: string; error?: string }[] = [];

  for (const source of sources) {
    try {
      const r = await runExport(source.id, "manual");
      results.push({ id: source.id, status: r.status, error: r.error ?? undefined });
    } catch (err) {
      results.push({ id: source.id, status: "failed", error: (err as Error).message });
    }
  }

  return NextResponse.json({ pulled: results.length, results });
}
