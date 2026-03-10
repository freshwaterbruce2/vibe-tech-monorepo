import { prisma } from '@/lib/prisma';

async function main() {
  const products = await prisma.product.findMany({
    include: { category: true }
  });

  console.log(`Found ${products.length} products.`);

  for (const p of products) {
    console.log(`[${p.id}] ${p.name}`);
    console.log(`   Category: ${p.category?.name || 'NULL'} (${p.categoryId})`);
    console.log(`   TrendScore: ${p.trendScore}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
