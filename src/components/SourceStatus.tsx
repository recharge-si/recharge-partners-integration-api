import { StatusBadge, type Tone } from "@/components/ui/StatusBadge";
import { PingDot, type DotTone } from "@/components/ui/PingDot";
import type { SourceListItem } from "@/lib/data";

/** Resolve a source + its last run into a coherent status presentation. */
export function resolveStatus(s: Pick<SourceListItem, "status" | "lastRun" | "running">): {
  dot: DotTone;
  tone: Tone;
  label: string;
} {
  if (s.running) return { dot: "cyan", tone: "cyan", label: "Pulling…" };
  if (s.status === "disabled") return { dot: "neutral", tone: "neutral", label: "Disabled" };
  if (s.status === "wip") return { dot: "amber", tone: "amber", label: "In progress" };

  // live
  if (s.lastRun?.status === "failed") return { dot: "red", tone: "red", label: "Failed" };
  if (s.lastRun?.status === "success") return { dot: "cyan", tone: "cyan", label: "Live" };
  return { dot: "neutral", tone: "cyan", label: "Live" }; // live, never run
}

export function SourceStatus({ source }: { source: Pick<SourceListItem, "status" | "lastRun" | "running"> }) {
  const { dot, tone, label } = resolveStatus(source);
  return (
    <span className="inline-flex items-center gap-2">
      <PingDot tone={dot} />
      <StatusBadge tone={tone}>{label}</StatusBadge>
    </span>
  );
}
