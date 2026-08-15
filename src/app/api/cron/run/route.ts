import { NextResponse } from "next/server";
import { getEnv } from "@/env";
import { runAllScheduled } from "@/lib/cron/scheduler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/cron/run — manually trigger a pull of all schedule-enabled sources.
 * Useful for external schedulers or a "Run all now" button. Protected by
 * CRON_SECRET via the `Authorization: Bearer <secret>` header when that env var
 * is set; open otherwise (intended for behind-the-firewall self-hosting).
 */
export async function POST(req: Request) {
  const { CRON_SECRET } = getEnv();
  if (CRON_SECRET) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  await runAllScheduled();
  return NextResponse.json({ ok: true });
}
