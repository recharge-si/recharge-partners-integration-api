/** Live-status dot — only the healthy (cyan) state pings; others are static. */
export const DOT_COLORS = {
  cyan: "#01a0be",
  red: "#f87171",
  amber: "#fbbf24",
  neutral: "#737373",
} as const;

export type DotTone = keyof typeof DOT_COLORS;

export function PingDot({ tone }: { tone: DotTone }) {
  const backgroundColor = DOT_COLORS[tone];
  const healthy = tone === "cyan";
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      {healthy && (
        <span
          className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{ backgroundColor }}
        />
      )}
      <span
        className="relative inline-flex h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor }}
      />
    </span>
  );
}
