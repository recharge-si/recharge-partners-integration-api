import { FeedSchema, type Feed } from "./schema";
import { z } from "zod";

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

/**
 * Validate an already-parsed JSON value against the feed contract.
 * Returns every issue with its exact path — never throws on invalid input.
 */
export function validateFeed(input: unknown): ValidationResult {
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

  // Best-effort stats even on failure, so the UI can hint at feed size.
  const maybe = input as { products?: unknown[] } | null;
  const products = Array.isArray(maybe?.products) ? maybe!.products.length : 0;

  return { ok: false, data: null, stats: { products, variants: 0 }, issues };
}
