import { ProductGrid } from "@/components/products/product-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import type { Product } from "@/types";
import { ChevronLeft, ExternalLink, ShieldCheck, TrendingUp, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

interface _ProductPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function getProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!product) return null;

  return {
    ...product,
    price: Number(product.price),
    trendScore: Number(product.trendScore),
    commissionRate: product.commissionRate ? Number(product.commissionRate) : null,
  };
}

async function getRelatedProducts(categoryId: string, excludeId: string): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: {
      categoryId,
      id: { not: excludeId },
      isActive: true,
    },
    take: 4,
    orderBy: { trendScore: 'desc' },
  });

  return products.map(p => ({
    ...p,
    price: Number(p.price),
    trendScore: Number(p.trendScore),
    commissionRate: p.commissionRate ? Number(p.commissionRate) : null,
  })) as Product[];
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  const relatedProducts = product.categoryId
    ? await getRelatedProducts(product.categoryId, product.id)
    : [];

  return (
    <div className="min-h-screen pb-20">
      <div className="container py-8">
        <Link
          href="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back to Trending
        </Link>

        <div className="grid md:grid-cols-2 gap-12 lg:gap-16">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted border">
              <Image
                src={product.imageUrl ?? "/placeholder.svg"}
                alt={product.name}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />

              {product.trendScore >= 60 && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-orange-500 text-white px-3 py-1 text-sm flex items-center gap-1.5 shadow-lg">
                    <TrendingUp className="h-4 w-4" />
                    Trending #{Math.round(product.trendScore)}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="flex flex-col">
            <div className="mb-2">
              <Link href={`/category/${product.category?.slug}`} className="text-sm font-medium text-orange-600 hover:underline">
                {product.category?.name ?? "General"}
              </Link>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              {product.name}
            </h1>

            <div className="flex items-center gap-4 mb-6">
              <span className="text-3xl font-bold">
                ${product.price.toFixed(2)}
              </span>
              <Badge variant="outline" className="text-muted-foreground">
                Retail Price
              </Badge>
            </div>

            <div className="prose prose-sm dark:prose-invert max-w-none mb-8 text-muted-foreground leading-relaxed">
              <p>{product.description ?? "No detailed description available for this product."}</p>
            </div>

            <div className="space-y-4 mb-10">
              <div className="flex items-center gap-3 text-sm">
                <ShieldCheck className="h-5 w-5 text-green-500" />
                <span>Verified Deal from <strong>{product.merchantName}</strong></span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Truck className="h-5 w-5 text-blue-500" />
                <span>Shipping availability checked daily</span>
              </div>
            </div>

            <div className="mt-auto pt-6 border-t">
              <Button asChild size="lg" className="w-full sm:w-auto h-14 px-12 text-lg font-semibold bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 shadow-xl hover:shadow-orange-500/20 transition-all active:scale-[0.98]">
                <a
                  href={product.affiliateLink}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                >
                  View Best Deal
                  <ExternalLink className="ml-2 h-5 w-5" />
                </a>
              </Button>
              <p className="text-[10px] text-muted-foreground mt-3 text-center sm:text-left italic">
                * Prices and availability are accurate as of {new Date().toLocaleDateString()}.
              </p>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-24">
            <h2 className="text-2xl font-bold mb-8">Related Trending Products</h2>
            <ProductGrid products={relatedProducts} />
          </div>
        )}
      </div>
    </div>
  );
}
