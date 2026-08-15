import cron from "node-cron";
import { getEnv } from "@/env";
import { SOURCES } from "@/lib/sources/registry";
import { runExport } from "@/lib/run/runExport";

let started = false;

/**
 * Boot the in-process scheduler. Called once from instrumentation.ts on server
 * start. Reads CRON_EXPRESSION / CRON_TIMEZONE from the environment and exports
 * every code-registry source with `scheduleEnabled: true` on each tick.
 */
export function startScheduler(): void {
  if (started) return; // guard against double-registration on hot reload

  // Must never crash server boot — bad/missing env just disables the scheduler.
  let env;
  try {
    env = getEnv();
  } catch (err) {
    console.error(`[cron] not started — invalid env: ${(err as Error).message}`);
    return;
  }

  if (!env.CRON_ENABLED) {
    console.log("[cron] disabled (set CRON_ENABLED=true to enable)");
    return;
  }
  if (!cron.validate(env.CRON_EXPRESSION)) {
    console.error(`[cron] invalid CRON_EXPRESSION: "${env.CRON_EXPRESSION}" — scheduler not started`);
    return;
  }

  cron.schedule(
    env.CRON_EXPRESSION,
    () => {
      void runAllScheduled();
    },
    { timezone: env.CRON_TIMEZONE },
  );

  started = true;
  console.log(`[cron] scheduled "${env.CRON_EXPRESSION}" (${env.CRON_TIMEZONE})`);
}

/** Export every schedule-enabled source. Errors are isolated per source. */
export async function runAllScheduled(): Promise<void> {
  const sources = SOURCES.filter((s) => s.scheduleEnabled && s.status !== "disabled");
  console.log(`[cron] tick — ${sources.length} scheduled source(s)`);

  for (const source of sources) {
    try {
      const result = await runExport(source.id, "scheduled");
      console.log(`[cron] ${source.brand}: ${result.status}`, result.counts);
    } catch (err) {
      console.error(`[cron] ${source.brand}: ${(err as Error).message}`);
    }
  }
}
