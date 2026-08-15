"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * While `active` (a pull is running somewhere), periodically refresh the server
 * components so the live state (Pulling… → Live, new counts) updates without a
 * manual reload.
 */
export function AutoRefresh({ active, intervalMs = 4000 }: { active: boolean; intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(t);
  }, [active, intervalMs, router]);
  return null;
}
