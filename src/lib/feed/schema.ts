import { z } from "zod";

/**
 * The "our company standard" supplier feed format (schemaVersion 1.0).
 *
 * This is the single source of truth for the contract documented in
 * docs/FEED-FORMAT.md. The portal VALIDATES against this — it never guesses or
 * coerces. One invalid field rejects the whole import.
 */

export const PriceSchema = z
  .object({
    amount: z.number().min(0),
    vat: z.number().min(0), // VAT percentage
    taxMode: z.enum(["gross", "net"]),
  })
  .strict();

export const ImageSchema = z
  .object({
    src: z.string().url(),
    alt: z.string().optional(),
  })
  .strict();

export const VariantSchema = z
  .object({
    sku: z.string().min(1),
    barcode: z.string().optional(),
    option1: z.string().optional(), // variant value, e.g. size
    stock: z.number().int().min(0),
    price: PriceSchema,
    image: z.string().url().optional(),
  })
  .strict();

export const ProductSchema = z
  .object({
    externalId: z.string().min(1),
    name: z.string().min(1),
    descriptionHtml: z.string().optional(),
    vendor: z.string().optional(),
    productType: z.string().optional(),
    status: z.enum(["active", "draft"]).optional(),
    tags: z.array(z.string()).optional(),
    categoryPaths: z.array(z.string()).optional(),
    images: z.array(ImageSchema).optional(),
    variants: z.array(VariantSchema).min(1),
  })
  .strict();

export const FeedSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    brand: z.string().min(1),
    currency: z.string().length(3), // ISO-4217
    generatedAt: z.string().datetime({ offset: true }), // ISO-8601 UTC
    products: z.array(ProductSchema),
  })
  .strict()
  .superRefine((feed, ctx) => {
    // externalId must be unique per feed.
    const seenExternalIds = new Map<string, number>();
    // sku must be globally unique across all variants in the feed.
    const seenSkus = new Map<string, string>(); // sku -> "products[i].variants[j]"

    feed.products.forEach((product, pi) => {
      const prevExternal = seenExternalIds.get(product.externalId);
      if (prevExternal !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["products", pi, "externalId"],
          message: `Duplicate externalId "${product.externalId}" (also at products[${prevExternal}])`,
        });
      } else {
        seenExternalIds.set(product.externalId, pi);
      }

      product.variants.forEach((variant, vi) => {
        const where = `products[${pi}].variants[${vi}]`;
        const prevSku = seenSkus.get(variant.sku);
        if (prevSku !== undefined) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["products", pi, "variants", vi, "sku"],
            message: `Duplicate sku "${variant.sku}" (also at ${prevSku})`,
          });
        } else {
          seenSkus.set(variant.sku, where);
        }
      });
    });
  });

export type Feed = z.infer<typeof FeedSchema>;
export type FeedProduct = z.infer<typeof ProductSchema>;
export type FeedVariant = z.infer<typeof VariantSchema>;
