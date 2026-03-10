import { prisma } from '@/lib/prisma';

async function main() {
  console.log('Clearing products and keywords...');
  await prisma.click.deleteMany();
  await prisma.product.deleteMany();
  await prisma.trendingKeyword.deleteMany();
  console.log('Database reset complete.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
