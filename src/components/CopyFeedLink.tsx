"use client";

import { useState } from "react";
import { CopyIcon } from "@/components/ui/icons";

/** Copy the absolute standardized-export URL to the clipboard. */
export function CopyFeedLink({ path, size = "sm" }: { path: string; size?: "sm" | "md" }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = typeof window !== "undefined" ? new URL(path, window.location.origin).toString() : path;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked (e.g. non-secure context) — fall back to a prompt.
      window.prompt("Copy feed link:", url);
    }
  }

  const base = size === "sm" ? "rounded-lg px-3 py-1.5 text-xs" : "rounded-xl px-4 py-2 text-sm";

  return (
    <button
      onClick={copy}
      className={`inline-flex items-center gap-1.5 font-medium text-neutral-300 transition-colors hover:border-[#01a0be]/40 hover:text-white ${base} border border-neutral-700 bg-neutral-800/60`}
    >
      <CopyIcon />
      {copied ? "Copied!" : "Copy feed link"}
    </button>
  );
}
