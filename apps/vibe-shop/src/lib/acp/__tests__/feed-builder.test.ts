import { describe, expect, it } from 'vitest';

import {
  buildAcpFeed,
  type AcpFeedInputProduct,
} from '../feed-builder';

const ACP_TOP_LEVEL_KEYS = new Set([
  'id',
  'title',
  'description',
  'url',
  'media',
  'variants',
]);

const ACP_VARIANT_KEYS = new Set([
  'id',
  'title',
  'description',
  'url',
  'barcodes',
  'price',
  'list_price',
  'unit_price',
  'availability',
  'categories',
  'condition',
  'variant_options',
  'media',
  'seller',
  'marketplace',
]);

function fixtureProduct(overrides: Partial<AcpFeedInputProduct> = {}): AcpFeedInputProduct {
  return {
    id: 'prod_001',
    name: 'Classic Widget',
    description: 'A reliable widget for everyday use.',
    price: { toString: () => '19.99' },
    currency: 'USD',
    imageUrl: 'https://cdn.example.com/widget.jpg',
    isActive: true,
    merchantName: 'Widget Co',
    ...overrides,
  };
}

function parseLines(jsonl: string): Array<Record<string, unknown>> {
  if (jsonl === '') {
    return [];
  }
  return jsonl.split('\n').map((line) => JSON.parse(line) as Record<string, unknown>);
}

describe('buildAcpFeed', () => {
  it('returns empty string for empty input', () => {
    expect(buildAcpFeed([])).toBe('');
  });

  it('emits one canonical Product object per line as valid JSON', () => {
    const out = buildAcpFeed([fixtureProduct(), fixtureProduct({ id: 'prod_002' })]);
    const lines = out.split('\n');
    expect(lines).toHaveLength(2);
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  it('does not emit a trailing newline', () => {
    const out = buildAcpFeed([fixtureProduct()]);
    expect(out.endsWith('\n')).toBe(false);
  });

  it('converts decimal price to integer ISO 4217 minor units', () => {
    const [product] = parseLines(buildAcpFeed([fixtureProduct({ price: { toString: () => '19.99' } })]));
    const variant = (product.variants as Array<Record<string, unknown>>)[0];
    expect((variant.price as Record<string, unknown>).amount).toBe(1999);
  });

  it('accepts numeric price input', () => {
    const [product] = parseLines(buildAcpFeed([fixtureProduct({ price: 4.5 })]));
    const variant = (product.variants as Array<Record<string, unknown>>)[0];
    expect((variant.price as Record<string, unknown>).amount).toBe(450);
  });

  it('clamps negative or non-finite price to zero', () => {
    const [neg] = parseLines(buildAcpFeed([fixtureProduct({ price: -1 })]));
    const [nan] = parseLines(buildAcpFeed([fixtureProduct({ price: Number.NaN })]));
    const [text] = parseLines(buildAcpFeed([fixtureProduct({ price: { toString: () => 'oops' } })]));
    expect(((neg.variants as Array<Record<string, unknown>>)[0].price as Record<string, unknown>).amount).toBe(0);
    expect(((nan.variants as Array<Record<string, unknown>>)[0].price as Record<string, unknown>).amount).toBe(0);
    expect(((text.variants as Array<Record<string, unknown>>)[0].price as Record<string, unknown>).amount).toBe(0);
  });

  it('defaults currency to USD when input currency is null', () => {
    const [product] = parseLines(buildAcpFeed([fixtureProduct({ currency: null })]));
    const variant = (product.variants as Array<Record<string, unknown>>)[0];
    expect((variant.price as Record<string, unknown>).currency).toBe('USD');
  });

  it('passes through non-USD currency', () => {
    const [product] = parseLines(buildAcpFeed([fixtureProduct({ currency: 'EUR' })]));
    const variant = (product.variants as Array<Record<string, unknown>>)[0];
    expect((variant.price as Record<string, unknown>).currency).toBe('EUR');
  });

  it('omits description entirely when input description is null', () => {
    const [product] = parseLines(buildAcpFeed([fixtureProduct({ description: null })]));
    expect(product).not.toHaveProperty('description');
    const variant = (product.variants as Array<Record<string, unknown>>)[0];
    expect(variant).not.toHaveProperty('description');
  });

  it('wraps description in canonical { plain } object', () => {
    const [product] = parseLines(buildAcpFeed([fixtureProduct({ description: 'Hello' })]));
    expect(product.description).toEqual({ plain: 'Hello' });
  });

  it('omits media entirely when imageUrl is null', () => {
    const [product] = parseLines(buildAcpFeed([fixtureProduct({ imageUrl: null })]));
    expect(product).not.toHaveProperty('media');
    const variant = (product.variants as Array<Record<string, unknown>>)[0];
    expect(variant).not.toHaveProperty('media');
  });

  it('emits media as canonical [{type:"image",url}] when imageUrl present', () => {
    const [product] = parseLines(buildAcpFeed([fixtureProduct({ imageUrl: 'https://x/y.jpg' })]));
    expect(product.media).toEqual([{ type: 'image', url: 'https://x/y.jpg' }]);
  });

  it('omits seller when merchantName is null', () => {
    const [product] = parseLines(buildAcpFeed([fixtureProduct({ merchantName: null })]));
    const variant = (product.variants as Array<Record<string, unknown>>)[0];
    expect(variant).not.toHaveProperty('seller');
  });

  it('emits seller.name when merchantName present', () => {
    const [product] = parseLines(buildAcpFeed([fixtureProduct({ merchantName: 'Acme Corp' })]));
    const variant = (product.variants as Array<Record<string, unknown>>)[0];
    expect(variant.seller).toEqual({ name: 'Acme Corp' });
  });

  it('marks active products as in_stock and inactive as discontinued', () => {
    const [active] = parseLines(buildAcpFeed([fixtureProduct({ isActive: true })]));
    const [inactive] = parseLines(buildAcpFeed([fixtureProduct({ isActive: false })]));
    expect(((active.variants as Array<Record<string, unknown>>)[0].availability as Record<string, unknown>)).toEqual({
      available: true,
      status: 'in_stock',
    });
    expect(((inactive.variants as Array<Record<string, unknown>>)[0].availability as Record<string, unknown>)).toEqual({
      available: false,
      status: 'discontinued',
    });
  });

  it('omits Product.url when no baseUrl is configured', () => {
    const [product] = parseLines(buildAcpFeed([fixtureProduct()], {}));
    expect(product).not.toHaveProperty('url');
    const variant = (product.variants as Array<Record<string, unknown>>)[0];
    expect(variant).not.toHaveProperty('url');
  });

  it('builds Product.url and Variant.url from baseUrl', () => {
    const [product] = parseLines(
      buildAcpFeed([fixtureProduct({ id: 'abc' })], { baseUrl: 'https://shop.example.com' }),
    );
    expect(product.url).toBe('https://shop.example.com/product/abc');
    const variant = (product.variants as Array<Record<string, unknown>>)[0];
    expect(variant.url).toBe('https://shop.example.com/product/abc');
  });

  it('strips trailing slashes from baseUrl', () => {
    const [product] = parseLines(
      buildAcpFeed([fixtureProduct({ id: 'abc' })], { baseUrl: 'https://shop.example.com///' }),
    );
    expect(product.url).toBe('https://shop.example.com/product/abc');
  });

  it('emits a single Variant with the same id and title as the parent Product', () => {
    const [product] = parseLines(buildAcpFeed([fixtureProduct({ id: 'p1', name: 'Thing' })]));
    const variants = product.variants as Array<Record<string, unknown>>;
    expect(variants).toHaveLength(1);
    expect(variants[0].id).toBe('p1');
    expect(variants[0].title).toBe('Thing');
  });

  it('emits no fields outside the canonical ACP Product / Variant key sets', () => {
    const out = buildAcpFeed([
      fixtureProduct({
        description: 'desc',
        imageUrl: 'https://x/y.jpg',
        merchantName: 'Acme',
      }),
    ], { baseUrl: 'https://shop.example.com' });
    const [product] = parseLines(out);

    for (const key of Object.keys(product)) {
      expect(ACP_TOP_LEVEL_KEYS, `unexpected top-level key: ${key}`).toContain(key);
    }
    const variant = (product.variants as Array<Record<string, unknown>>)[0];
    for (const key of Object.keys(variant)) {
      expect(ACP_VARIANT_KEYS, `unexpected variant key: ${key}`).toContain(key);
    }
  });

  it('does not emit any is_eligible_* or eligibility fields', () => {
    const json = buildAcpFeed([fixtureProduct()]);
    expect(json).not.toMatch(/is_eligible/);
    expect(json).not.toMatch(/enable_search/);
    expect(json).not.toMatch(/enable_checkout/);
  });
});
