/**
 * Builds an Agentic Commerce Protocol (ACP) product feed from vibe-shop's
 * affiliate-aggregator catalog.
 *
 * Spec: https://github.com/agentic-commerce-protocol/agentic-commerce-protocol
 * Version targeted: 2026-04-17 cross-vendor canonical (schema.feed.json)
 *
 * Discovery-only stance: this builder produces the catalog feed only.
 * vibe-shop intentionally does NOT implement schema.agentic_checkout.json
 * endpoints; per spec, the absence of checkout endpoints communicates that
 * fulfillment happens off-site (at the merchant's affiliate destination).
 */

export interface AcpFeedInputProduct {
  id: string;
  name: string;
  description: string | null;
  price: { toString(): string } | number;
  currency: string | null;
  imageUrl: string | null;
  isActive: boolean;
  merchantName: string | null;
}

export interface AcpFeedOptions {
  /** Site origin used to construct canonical product URLs, e.g. "https://vibeshop.example.com". */
  baseUrl?: string;
}

interface AcpDescription {
  plain: string;
}

interface AcpPrice {
  amount: number;
  currency: string;
}

interface AcpAvailability {
  available: boolean;
  status: 'in_stock' | 'discontinued';
}

interface AcpMedia {
  type: 'image';
  url: string;
}

interface AcpSeller {
  name: string;
}

interface AcpVariant {
  id: string;
  title: string;
  description?: AcpDescription;
  url?: string;
  price: AcpPrice;
  availability: AcpAvailability;
  seller?: AcpSeller;
  media?: AcpMedia[];
}

interface AcpProduct {
  id: string;
  title: string;
  description?: AcpDescription;
  url?: string;
  media?: AcpMedia[];
  variants: AcpVariant[];
}

const DEFAULT_CURRENCY = 'USD';

function toMinorUnits(price: AcpFeedInputProduct['price']): number {
  const raw = typeof price === 'number' ? price : parseFloat(price.toString());
  if (!Number.isFinite(raw) || raw < 0) {
    return 0;
  }
  return Math.round(raw * 100);
}

function buildProductUrl(productId: string, baseUrl?: string): string | undefined {
  if (!baseUrl) {
    return undefined;
  }
  const trimmed = baseUrl.replace(/\/+$/, '');
  return `${trimmed}/product/${productId}`;
}

function toAcpProduct(input: AcpFeedInputProduct, options: AcpFeedOptions): AcpProduct {
  const url = buildProductUrl(input.id, options.baseUrl);
  const description: AcpDescription | undefined = input.description
    ? { plain: input.description }
    : undefined;
  const media: AcpMedia[] | undefined = input.imageUrl
    ? [{ type: 'image', url: input.imageUrl }]
    : undefined;
  const seller: AcpSeller | undefined = input.merchantName
    ? { name: input.merchantName }
    : undefined;

  const price: AcpPrice = {
    amount: toMinorUnits(input.price),
    currency: input.currency ?? DEFAULT_CURRENCY,
  };

  const availability: AcpAvailability = {
    available: input.isActive,
    status: input.isActive ? 'in_stock' : 'discontinued',
  };

  const variant: AcpVariant = {
    id: input.id,
    title: input.name,
    price,
    availability,
    ...(description ? { description } : {}),
    ...(url ? { url } : {}),
    ...(seller ? { seller } : {}),
    ...(media ? { media } : {}),
  };

  return {
    id: input.id,
    title: input.name,
    variants: [variant],
    ...(description ? { description } : {}),
    ...(url ? { url } : {}),
    ...(media ? { media } : {}),
  };
}

/**
 * Builds the JSONL feed body. One canonical ACP `Product` object per line,
 * lines joined by `\n`, no trailing newline. Empty input → empty string.
 */
export function buildAcpFeed(
  products: AcpFeedInputProduct[],
  options: AcpFeedOptions = {},
): string {
  if (products.length === 0) {
    return '';
  }
  return products.map((p) => JSON.stringify(toAcpProduct(p, options))).join('\n');
}
