/**
 * Build an ACP product feed snapshot from the live Prisma catalog.
 *
 * Output: `${ACP_FEED_DIR}/products-<ISO8601>.jsonl.gz` and a `latest.jsonl.gz`
 * overwrite copy. ACP_FEED_DIR defaults to `D:\data\vibe-shop\acp-feed` per
 * the monorepo paths-policy (no runtime data on C:\dev).
 *
 * Usage: pnpm --filter vibe-shop tsx scripts/build-acp-feed.ts
 *
 * Reads `process.env.ACP_BASE_URL` for canonical product URL construction;
 * if unset, Product.url and Variant.url are omitted (valid per spec).
 */

import { gzipSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { prisma } from '../src/lib/prisma';
import { buildAcpFeed, type AcpFeedInputProduct } from '../src/lib/acp/feed-builder';

const DEFAULT_FEED_DIR = 'D:\\data\\vibe-shop\\acp-feed';

async function main(): Promise<void> {
  const feedDir = process.env.ACP_FEED_DIR ?? DEFAULT_FEED_DIR;
  const baseUrl = process.env.ACP_BASE_URL;

  await mkdir(feedDir, { recursive: true });

  const rows = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { trendScore: 'desc' },
  });

  const inputs: AcpFeedInputProduct[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    currency: row.currency,
    imageUrl: row.imageUrl,
    isActive: row.isActive,
    merchantName: row.merchantName,
  }));

  const jsonl = buildAcpFeed(inputs, baseUrl ? { baseUrl } : {});
  const gzipped = gzipSync(Buffer.from(jsonl, 'utf-8'));

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dated = join(feedDir, `products-${stamp}.jsonl.gz`);
  const latest = join(feedDir, 'latest.jsonl.gz');

  await writeFile(dated, gzipped);
  await writeFile(latest, gzipped);

  // eslint-disable-next-line no-console
  console.log(
    `acp-feed: wrote ${inputs.length} products → ${dated} (${gzipped.byteLength} bytes gzipped)`,
  );
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('acp-feed: failed', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
