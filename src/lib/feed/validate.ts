import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { z } from "zod";
import { FeedSchema, type Feed } from "./schema";
import ownSourceSchema from "./own-source.v1.json" with { type: "json" };

export type ValidationIssue = {
  /** Exact location of the problem, e.g. "products[0].variants[1].sku". */
  path: string;
  message: string;
};

export type FeedStats = {
  products: number;
  variants: number;
};

export type ValidationResult =
  | { ok: true; data: Feed; stats: FeedStats; issues: [] }
  | { ok: false; data: null; stats: FeedStats; issues: ValidationIssue[] };

/** Render a Zod issue path as `products[0].variants[1].sku`. */
function formatPath(path: readonly PropertyKey[]): string {
  return path
    .map((seg) => {
      if (typeof seg === "number") return `[${seg}]`;
      const key = String(seg);
      return key === "" ? "" : `.${key}`;
    })
    .join("")
    .replace(/^\./, "");
}

/** `/products/0/variants/1/sku` (JSON pointer) → `products[0].variants[1].sku`. */
function formatPointer(pointer: string): string {
  if (!pointer) return "";
  return formatPath(
    pointer
      .slice(1)
      .split("/")
      .map((seg) => seg.replace(/~1/g, "/").replace(/~0/g, "~"))
      .map((seg) => (/^\d+$/.test(seg) ? Number(seg) : seg)),
  );
}

/**
 * The portal's JSON Schema is the canonical contract: the export portal rejects
 * any feed it doesn't accept. `own-source.v1.json` is a verbatim copy of it
 * (`npm run check:schema` compares it with the live one).
 */
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats.default(ajv);
const matchesPortalSchema = ajv.compile(ownSourceSchema);

/**
 * Validate an already-parsed JSON value against the feed contract.
 * Returns every issue with its exact path — never throws on invalid input.
 *
 * Two passes: the portal's JSON Schema first (what the consumer will accept),
 * then Zod (typed data plus the cross-row rules a JSON Schema can't express,
 * like unique SKUs).
 */
export function validateFeed(input: unknown): ValidationResult {
  if (!matchesPortalSchema(input)) {
    const issues: ValidationIssue[] = (matchesPortalSchema.errors ?? []).map((e) => {
      const at = formatPointer(e.instancePath);
      const extra = e.keyword === "additionalProperties" ? ` (${String(e.params.additionalProperty)})` : "";
      return { path: at || "(root)", message: `${e.message ?? "invalid"}${extra}` };
    });
    return { ok: false, data: null, stats: { products: countProducts(input), variants: 0 }, issues };
  }

  const result = FeedSchema.safeParse(input);

  if (result.success) {
    const data = result.data;
    const variants = data.products.reduce((n, p) => n + p.variants.length, 0);
    return {
      ok: true,
      data,
      stats: { products: data.products.length, variants },
      issues: [],
    };
  }

  const issues: ValidationIssue[] = result.error.issues.map(
    (i: z.ZodIssue) => ({
      path: formatPath(i.path) || "(root)",
      message: i.message,
    }),
  );

  return { ok: false, data: null, stats: { products: countProducts(input), variants: 0 }, issues };
}

/** Best-effort stats even on failure, so the UI can hint at feed size. */
function countProducts(input: unknown): number {
  const maybe = input as { products?: unknown[] } | null;
  return Array.isArray(maybe?.products) ? maybe.products.length : 0;
}
