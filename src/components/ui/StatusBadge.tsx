/** Status badge + tones, per the design guide (BADGE_TONES). */
export const BADGE_TONES = {
  cyan: "bg-cyan-500/15 text-cyan-400 border-cyan-500/20",
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  red: "bg-red-500/10 text-red-400 border-red-500/30",
  green: "bg-green-500/10 text-green-400 border-green-500/20",
  neutral: "bg-neutral-700/40 text-neutral-300 border-neutral-600/40",
} as const;

export type Tone = keyof typeof BADGE_TONES;

export function StatusBadge({
  tone,
  children,
}: {
  tone: Tone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${BADGE_TONES[tone]}`}
    >
      {children}
    </span>
  );
}
