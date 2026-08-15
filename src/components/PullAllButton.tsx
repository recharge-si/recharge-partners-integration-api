"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PullIcon, Spinner } from "@/components/ui/icons";

/** "Pull all" — sequentially pulls every source, then refreshes. */
export function PullAllButton({ running = false }: { running?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const isRunning = busy || running;

  async function pullAll() {
    setBusy(true);
    setMsg(null);
    router.refresh();
    try {
      const res = await fetch("/api/pull-all", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Pull failed");
      } else {
        const ok = (data.results ?? []).filter((r: { status: string }) => r.status === "success").length;
        setMsg(`${ok}/${data.pulled} ok`);
      }
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-2">
      {msg && <span className="text-xs text-neutral-400">{msg}</span>}
      <button
        onClick={pullAll}
        disabled={isRunning}
        className="inline-flex items-center gap-2 rounded-xl bg-[#01a0be] px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-[#01a0be]/20 transition-all hover:bg-[#018a9f] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isRunning ? <Spinner className="h-4 w-4" /> : <PullIcon className="h-4 w-4" />}
        {isRunning ? "Pulling all…" : "Pull all"}
      </button>
    </div>
  );
}
