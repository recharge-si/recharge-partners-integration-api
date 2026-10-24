import Link from "next/link";
import { listSourcesWithHealth, type SourceListItem } from "@/lib/data";
import { SourceStatus } from "@/components/SourceStatus";
import { PullButton } from "@/components/PullButton";
import { PullAllButton } from "@/components/PullAllButton";
import { CopyFeedLink } from "@/components/CopyFeedLink";
import { AutoRefresh } from "@/components/AutoRefresh";

export const dynamic = "force-dynamic";

function relTime(iso: string | null): string {
  if (!iso) return "never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default async function DashboardPage() {
  const sources = await listSourcesWithHealth();
  const live = sources.filter((s) => s.status === "live").length;
  const anyRunning = sources.some((s) => s.running);

  return (
    <div className="animate-fade-in space-y-6">
      <AutoRefresh active={anyRunning} />
      {/* Compact page header */}
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#01a0be]/30 bg-[#01a0be]/10">
            <FeedIcon className="h-5 w-5 text-[#01a0be]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="mb-0 text-xl font-bold leading-none tracking-tight text-white">
                Partner sources
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#01a0be]/25 bg-[#01a0be]/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-widest text-[#01a0be]">
                {live} live
              </span>
            </div>
            <p className="mt-1 hidden text-xs text-neutral-500 sm:block">
              Standardized exports mapped from each partner&rsquo;s feed, published for the export portal.
            </p>
          </div>
        </div>
        <PullAllButton running={anyRunning} />
      </header>

      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-2 backdrop-blur-sm sm:p-3">
        {/* Desktop table */}
        <table className="hidden w-full text-sm md:table">
          <thead>
            <tr className="text-left text-neutral-500">
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Last pulled</th>
              <th className="px-4 py-3 font-medium">Schedule</th>
              <th className="px-4 py-3 font-medium">Export</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {sources.map((s) => (
              <tr key={s.id} className="transition-colors hover:bg-neutral-800/30">
                <td className="px-4 py-3">
                  <Link href={`/sources/${s.id}`} className="group flex items-center gap-3">
                    <SourceTile source={s} />
                    <span className="min-w-0">
                      <span className="block font-medium text-white group-hover:text-[#01a0be]">
                        {s.brand}
                      </span>
                      <span className="block max-w-md truncate text-xs text-neutral-500">
                        {s.description}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <SourceStatus source={s} />
                </td>
                <td className="px-4 py-3 text-neutral-400">
                  <span className="tabular-nums">{relTime(s.snapshot?.builtAt ?? null)}</span>
                  {s.snapshot && (
                    <span className="ml-2 text-xs text-neutral-600">
                      {s.snapshot.products}p · {s.snapshot.variants}v
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-neutral-400">{s.scheduleEnabled ? "On" : "Off"}</td>
                <td className="px-4 py-3">
                  <ExportLink source={s} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <CopyFeedLink path={s.exportPath} />
                    <PullButton sourceId={s.id} size="sm" running={s.running} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Mobile cards */}
        <div className="space-y-3 md:hidden">
          {sources.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-neutral-700/50 bg-neutral-800/40 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <Link href={`/sources/${s.id}`} className="flex min-w-0 items-center gap-3">
                  <SourceTile source={s} />
                  <span className="min-w-0">
                    <span className="block font-medium text-white">{s.brand}</span>
                    <span className="block truncate text-xs text-neutral-500">{s.description}</span>
                  </span>
                </Link>
                <SourceStatus source={s} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <dt className="text-neutral-500">Last pulled</dt>
                  <dd className="text-neutral-300">{relTime(s.snapshot?.builtAt ?? null)}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500">Schedule</dt>
                  <dd className="text-neutral-300">{s.scheduleEnabled ? "On" : "Off"}</dd>
                </div>
              </dl>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ExportLink source={s} />
                <CopyFeedLink path={s.exportPath} />
                <PullButton sourceId={s.id} size="sm" running={s.running} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SourceTile({ source }: { source: SourceListItem }) {
  const accent = source.accent ?? "#01a0be";
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm font-bold"
      style={{
        color: accent,
        borderColor: `${accent}55`,
        backgroundColor: `${accent}1a`,
      }}
    >
      {source.brand.charAt(0)}
    </span>
  );
}

function ExportLink({ source }: { source: SourceListItem }) {
  if (!source.snapshot) {
    return <span className="text-xs text-neutral-600">not pulled yet</span>;
  }
  return (
    <a
      href={source.exportPath}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-center gap-1 text-sm font-medium text-neutral-300 transition-colors hover:text-[#01a0be]"
    >
      View export
      <span className="transition-transform group-hover:translate-x-1">→</span>
    </a>
  );
}

function FeedIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
    </svg>
  );
}
