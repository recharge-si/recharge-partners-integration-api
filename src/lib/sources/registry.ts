/**
 * Partner source registry — DEFINED IN CODE, not in the database.
 *
 * Each partner exports its catalogue in its own shape (x/y/z). The mapping from
 * that native shape into OUR standard feed format lives in code (see
 * `builders.ts`) because it's bespoke per partner. The portal then serves the
 * standardized export at `/api/export/<id>` — that's the link the UI lists.
 *
 * To onboard a partner: add an entry here + a builder in `builders.ts`.
 */

export type SourceStatus = "live" | "wip" | "disabled";

export type PartnerSource = {
  /** Stable code id — used in URLs and as the ImportRun key. */
  id: string;
  /** Display name shown in the portal. */
  brand: string;
  /** One-line description of the partner / catalogue. */
  description: string;
  /** Human note about the partner's native export format. */
  nativeFormat: string;
  /** Brand colour for the icon tile (hex). Defaults to the cyan accent. */
  accent?: string;
  status: SourceStatus;
  /** Whether the global cron includes this source. */
  scheduleEnabled: boolean;
};

export const SOURCES: PartnerSource[] = [
  {
    id: "point-7",
    brand: "POINT-7",
    description: "The Darkside of Windsurf",
    nativeFormat: "POINT-7 WP store export (JSON)",
    accent: "#e2231a",
    status: "live",
    scheduleEnabled: true,
  },
  {
    id: "unifiber",
    brand: "Unifiber",
    description: "Equipe Trading B2B — Unifiber and partner brands",
    nativeFormat: "Equipe Trading CSV (live stock export + emailed master export)",
    accent: "#0b63b0",
    status: "live",
    scheduleEnabled: true,
  },
  // Patrik and further partners go here once their builders exist.
];

/** Path to a source's standardized export feed. */
export function exportPath(id: string): string {
  return `/api/export/${id}`;
}

export function getSource(id: string): PartnerSource | undefined {
  return SOURCES.find((s) => s.id === id);
}
