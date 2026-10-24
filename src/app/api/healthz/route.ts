import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/healthz — bare liveness probe for the CI deploy (no DB, no partner fetch).
export function GET() {
  return NextResponse.json({ ok: true });
}
