/**
 * Next.js instrumentation hook — runs once when a server instance starts.
 * We use it to boot the in-process node-cron scheduler. Guarded to the Node.js
 * runtime so it never tries to load `node-cron` in the Edge runtime.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startScheduler } = await import("@/lib/cron/scheduler");
    startScheduler();
  }
}
