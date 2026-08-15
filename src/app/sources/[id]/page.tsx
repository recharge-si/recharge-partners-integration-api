import Link from "next/link";
import { notFound } from "next/navigation";
import { getSourceItem, listRuns, type ImportRunDTO } from "@/lib/data";
import { SourceStatus } from "@/components/SourceStatus";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PullButton } from "@/components/PullButton";
import { CopyFeedLink } from "@/components/CopyFeedLink";
import { AutoRefresh } from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";

function fmt(iso: string | null): string {
  return iso ? new Date(iso).toISOString().replace("T", " ").slice(0, 19) + " UTC" : "—";
}

export default async function SourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const source = await getSourceItem(id);
  if (!source) notFound();

  let runs: ImportRunDTO[] = [];
  try {
    runs = await listRuns(id);
  } catch {
    /* DB unreachable — show the page without history */
  }
  const accent = source.accent ?? "#01a0be";

  return (
    <div className="animate-fade-in space-y-6">
      <AutoRefresh active={source.running} />
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-neutral-400 transition-colors hover:text-[#01a0be]"
      >
        ← Back to sources
      </Link>

      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-lg font-bold"
            style={{ color: accent, borderColor: `${accent}55`, backgroundColor: `${accent}1a` }}
          >
            {source.brand.charAt(0)}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="mb-0 text-xl font-bold leading-none tracking-tight text-white">
                {source.brand}
              </h1>
              <SourceStatus source={source} />
            </div>
            <p className="mt-1 text-sm text-neutral-400">{source.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {source.snapshot && (
            <>
              <a
                href={source.exportPath}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800/60 px-4 py-2.5 text-sm font-medium text-neutral-300 transition-colors hover:border-[#01a0be]/40 hover:text-white"
              >
                View export
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </a>
              <CopyFeedLink path={source.exportPath} size="md" />
            </>
          )}
          {source.hasBuilder ? (
            <PullButton sourceId={source.id} running={source.running} />
          ) : (
            <span className="inline-flex items-center rounded-xl border border-neutral-700 bg-neutral-800/60 px-4 py-2.5 text-sm font-medium text-neutral-500">
              No builder yet
            </span>
          )}
        </div>
      </header>

      {/* Info card */}
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-4 backdrop-blur-sm sm:p-6">
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Source id" value={<span className="font-mono text-neutral-200">{source.id}</span>} />
          <Info label="Native format" value={source.nativeFormat} />
          <Info label="Scheduled" value={source.scheduleEnabled ? "On (global cron)" : "Off"} />
          <Info
            label="Standardized export"
            value={
              <span className="font-mono text-neutral-200">
                {source.snapshot ? source.exportPath : "not pulled yet"}
              </span>
            }
          />
        </dl>
      </section>

      {/* History */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-white">Source history</h2>
          <span className="text-xs text-neutral-500">when this source was pulled</span>
        </div>

        {runs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/40 p-8 text-center text-sm text-neutral-500">
            No exports recorded yet.
          </div>
        ) : (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-2 backdrop-blur-sm sm:p-3">
            <table className="hidden w-full text-sm md:table">
              <thead>
                <tr className="text-left text-neutral-500">
                  <th className="px-4 py-3 font-medium">When</th>
                  <th className="px-4 py-3 font-medium">Trigger</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Products</th>
                  <th className="px-4 py-3 text-right font-medium">Variants</th>
                  <th className="px-4 py-3 font-medium">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {runs.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-800/30">
                    <td className="px-4 py-3 font-mono text-xs text-neutral-300">{fmt(r.startedAt)}</td>
                    <td className="px-4 py-3 text-neutral-400">{r.trigger}</td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={r.status === "success" ? "cyan" : r.status === "running" ? "amber" : "red"}>
                        {r.status}
                        {r.dryRun ? " · dry" : ""}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-neutral-400">{r.counts.products}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-neutral-400">{r.counts.variants}</td>
                    <td
                      className="max-w-[260px] truncate px-4 py-3 text-neutral-500"
                      title={r.error ?? (r.issues.length ? `${r.issues.length} issue(s)` : "")}
                    >
                      {r.error ?? (r.issues.length ? `${r.issues.length} issue(s)` : "")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div className="space-y-3 md:hidden">
              {runs.map((r) => (
                <div key={r.id} className="rounded-xl border border-neutral-700/50 bg-neutral-800/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-neutral-300">{fmt(r.startedAt)}</span>
                    <StatusBadge tone={r.status === "success" ? "cyan" : r.status === "running" ? "amber" : "red"}>
                      {r.status}
                      {r.dryRun ? " · dry" : ""}
                    </StatusBadge>
                  </div>
                  <p className="mt-2 text-xs text-neutral-400">
                    {r.trigger} · {r.counts.products}p · {r.counts.variants}v
                  </p>
                  {(r.error || r.issues.length > 0) && (
                    <p className="mt-1 text-xs text-neutral-500">
                      {r.error ?? `${r.issues.length} issue(s)`}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-neutral-500">{label}</dt>
      <dd className="mt-1 text-neutral-200">{value}</dd>
    </div>
  );
}
