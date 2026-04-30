import { NextResponse } from 'next/server';

export const dynamic = 'force-static';
export const revalidate = 3600;

const AI_DISCOVERY_DOCUMENT = {
  aiendpoint: '1.0',
  service: {
    name: 'Vibe Shop',
    description:
      'Trend-driven affiliate product aggregator. Discovers and ranks affiliate products from multiple merchant networks; redirects users to merchant sites for purchase.',
    category: ['ecommerce', 'affiliate', 'discovery'],
    language: ['en'],
  },
  capabilities: [
    {
      id: 'click_product',
      description:
        'Log a click against a product and 302-redirect to its affiliate URL.',
      endpoint: '/api/click/{productId}',
      method: 'GET',
      params: {
        productId: 'string, required — product UUID from the catalog',
      },
      returns:
        '302 redirect to merchant affiliate URL, or 404 if product is unknown',
    },
  ],
  auth: {
    type: 'none',
  },
  token_hints: {
    compact_mode: false,
    field_filtering: false,
    delta_support: false,
  },
} as const;

export function GET() {
  return NextResponse.json(AI_DISCOVERY_DOCUMENT, {
    headers: {
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
