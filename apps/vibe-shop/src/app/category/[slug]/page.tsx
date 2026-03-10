import { ProductGrid } from "@/components/products/product-grid";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import type { Product } from "@/types";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

interface CategoryPageProps {
  params: Promise<{
    slug: string;
  }>;
}

async function getCategory(slug: string) {
  const category = await prisma.category.findUnique({
    where: { slug: slug },
  });

  if (!category) return null;
  return category;
}

async function getCategoryProducts(categoryId: string): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true, categoryId: categoryId },
    orderBy: { trendScore: 'desc' },
    take: 50,
  });

  return products.map(p => ({
    ...p,
    price: Number(p.price),
    trendScore: Number(p.trendScore),
    commissionRate: p.commissionRate ? Number(p.commissionRate) : null,
  })) as Product[];
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = await getCategory(slug);

  if (!category) {
    notFound();
  }

  const products = await getCategoryProducts(category.id);

  return (
    <div className="min-h-screen py-10">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
               <Badge variant="secondary" className="text-sm">
                  Category
               </Badge>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight capitalize">
              {category.name}
            </h1>
            <p className="text-muted-foreground mt-2">
              Best trending {category.name.toLowerCase()} products selected by AI.
            </p>
          </div>
          <div className="text-right">
             <Badge variant="outline" className="text-sm">
                {products.length} Products
             </Badge>
          </div>
        </div>

        {products.length > 0 ? (
          <ProductGrid products={products} showRanking />
        ) : (
          <div className="text-center py-20 bg-muted/30 rounded-xl">
             <p className="text-lg text-muted-foreground">No trending products found in this category yet.</p>
             <p className="text-sm text-muted-foreground mt-2">Check back tomorrow!</p>
          </div>
        )}
      </div>
    </div>
  );
}
