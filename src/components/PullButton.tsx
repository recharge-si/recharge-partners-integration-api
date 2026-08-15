"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PullIcon, Spinner } from "@/components/ui/icons";

type Result = {
  status: "success" | "failed";
  dryRun: boolean;
  counts: { products: number; variants: number };
  error: string | null;
};

/**
 * "Pull now" for a single source: fetches + maps + stores the export, then
 * refreshes. `running` (from the server) keeps the button in its pulling state
 * across reloads while a pull is in progress elsewhere.
 */
export function PullButton({
  sourceId,
  size = "md",
  running = false,
}: {
  sourceId: string;
  size?: "sm" | "md";
  running?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const isRunning = busy || running;

  async function pull() {
    setBusy(true);
    setMsg(null);
    router.refresh(); // surface the server "running" state immediately
    try {
      const res = await fetch(`/api/sources/${sourceId}/pull`, { method: "POST" });
      const data = (await res.json()) as Result & { error?: string };
      if (!res.ok || data.status === "failed") {
        setMsg({ ok: false, text: data.error || "Pull failed" });
      } else {
        setMsg({ ok: true, text: `${data.counts.products}p · ${data.counts.variants}v${data.dryRun ? " · dry" : ""}` });
      }
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  const base = size === "sm" ? "rounded-lg px-3 py-1.5 text-xs" : "rounded-xl px-4 py-2 text-sm";

  return (
    <span className="inline-flex items-center gap-2">
      <button
        onClick={pull}
        disabled={isRunning}
        className={`inline-flex items-center gap-1.5 font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-60 ${base} bg-[#01a0be] shadow-lg shadow-[#01a0be]/20 hover:bg-[#018a9f]`}
      >
        {isRunning ? <Spinner /> : <PullIcon />}
        {isRunning ? "Pulling…" : "Pull now"}
      </button>
      {msg && <span className={`text-xs ${msg.ok ? "text-cyan-400" : "text-red-400"}`}>{msg.text}</span>}
    </span>
  );
}
