import { NextResponse } from "next/server";
import { runExport } from "@/lib/run/runExport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// POINT-7's source feed can take ~45s to fetch; allow a long handler.
export const maxDuration = 120;

// POST /api/sources/:id/pull — build, validate, store the export, record a run.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const result = await runExport(id, "manual");
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
