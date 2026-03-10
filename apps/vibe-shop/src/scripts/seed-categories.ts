import { prisma } from '@/lib/prisma';

const categories = [
  { name: 'Electronics', slug: 'electronics', keywords: ['tech', 'phone', 'laptop', 'camera', 'headphones', 'drone', 'watch'] },
  { name: 'Home & Garden', slug: 'home-garden', keywords: ['garden', 'furniture', 'kitchen', 'decor', 'chair', 'desk', 'espresso'] },
  { name: 'Fashion', slug: 'fashion', keywords: ['clothes', 'shirt', 'pants', 'shoes', 'bag', 'backpack'] },
  { name: 'Health & Beauty', slug: 'health-beauty', keywords: ['makeup', 'skin', 'fitness', 'supplement', 'wellness'] },
  { name: 'Toys & Hobbies', slug: 'toys-hobbies', keywords: ['toy', 'game', 'lego', 'puzzle'] },
  { name: 'Sports', slug: 'sports', keywords: ['sport', 'gym', 'run', 'bike', 'yoga'] },
];

async function main() {
  console.log('Seeding categories...');

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: {
        name: cat.name,
        slug: cat.slug,
        isActive: true
      },
    });
  }

  console.log('Categories seeded successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
