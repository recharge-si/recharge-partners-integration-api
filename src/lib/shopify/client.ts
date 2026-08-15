import { getEnv, isShopifyConfigured } from "@/env";

/**
 * Minimal Shopify Admin GraphQL client.
 *
 * STATUS: scaffolding. `adminGraphQL` works once SHOPIFY_* env vars are set,
 * but the actual product/variant mutations live in sync.ts and are still TODO.
 * See docs/ROADMAP.md → "Shopify sync".
 */
export class ShopifyNotConfiguredError extends Error {
  constructor() {
    super("Shopify Admin API credentials are not configured");
  }
}

export async function adminGraphQL<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  if (!isShopifyConfigured()) throw new ShopifyNotConfiguredError();
  const env = getEnv();
  const endpoint = `https://${env.SHOPIFY_STORE_DOMAIN}/admin/api/${env.SHOPIFY_API_VERSION}/graphql.json`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": env.SHOPIFY_ADMIN_ACCESS_TOKEN!,
    },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Shopify Admin API HTTP ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as { data?: T; errors?: unknown };
  if (body.errors) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(body.errors)}`);
  }
  return body.data as T;
}
