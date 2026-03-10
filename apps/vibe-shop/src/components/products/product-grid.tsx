import { ProductCard } from "@/components/products/product-card";
import type { Product } from "@/types";

interface ProductGridProps {
  products: Product[];
  showRanking?: boolean;
}

export function ProductGrid({ products, showRanking = false }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg text-muted-foreground">
          No products found. Check back soon for trending deals!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {products.map((product, index) => (
        <ProductCard
          key={product.id}
          product={product}
          rank={showRanking ? index + 1 : undefined}
        />
      ))}
    </div>
  );
}
