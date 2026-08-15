import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db/mongoose";
import { ExportSnapshot } from "@/lib/models/ExportSnapshot";
import { getSource } from "@/lib/sources/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/export/:id — the standardized export feed for a partner source.
 *
 * Serves the STORED snapshot (from the last pull), so it's instant. The feed is
 * built + validated + stored by a pull (POST /api/sources/:id/pull or the cron).
 * If a source has never been pulled, returns 404 with a hint.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!getSource(id)) {
    return NextResponse.json({ error: `Unknown source "${id}"` }, { status: 404 });
  }

  await connectDB();
  const snapshot = await ExportSnapshot.findOne({ sourceId: id }).lean();
  if (!snapshot) {
    return NextResponse.json(
      { error: `No export stored for "${id}" yet. Trigger a pull first.` },
      { status: 404 },
    );
  }

  return NextResponse.json(snapshot.feed);
}
