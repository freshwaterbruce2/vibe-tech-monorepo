import { Header } from "@/components/layout/header";
import { ProductGrid } from "@/components/products/product-grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import type { Product } from "@/types";
import { Flame, Search, Sparkles, TrendingUp, Zap } from "lucide-react";
import Link from "next/link";

const CATEGORY_ICONS: Record<string, typeof Zap> = {
  electronics: Zap,
  "home-garden": Sparkles,
  fashion: Flame,
  sports: TrendingUp,
  beauty: Sparkles,
  toys: Sparkles,
  automotive: Zap,
};

async function getTrendingProducts(): Promise<Product[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { trendScore: "desc" },
    take: 8,
  });

  return products.map((p) => ({
    ...p,
    price: Number(p.price),
    trendScore: Number(p.trendScore),
    commissionRate: p.commissionRate ? Number(p.commissionRate) : null,
  })) as Product[];
}

async function getCategories() {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: "asc" },
  });

  return categories.map((c) => ({
    name: c.name,
    slug: c.slug,
    icon: CATEGORY_ICONS[c.slug] ?? Sparkles,
    count: c._count.products,
  }));
}

export default async function HomePage() {
  const [products, categories] = await Promise.all([
    getTrendingProducts(),
    getCategories(),
  ]);

  return (
    <>
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-pink-500/5 to-transparent" />
        <div className="container relative py-16 md:py-24 lg:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 border-orange-500/20">
              <Flame className="mr-1 h-3 w-3" />
              Trending Now
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Discover{" "}
              <span className="bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                trending products
              </span>{" "}
              with the best deals
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
              AI-powered product discovery that finds the hottest deals across
              the web. Updated daily with curated picks from top retailers.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <form
                action="/search"
                className="flex w-full max-w-md items-center rounded-full border border-input bg-background shadow-sm overflow-hidden"
              >
                <Search className="ml-4 h-5 w-5 text-muted-foreground shrink-0" />
                <input
                  name="q"
                  type="search"
                  placeholder="Search for products..."
                  className="flex-1 bg-transparent px-3 py-3 text-sm outline-none placeholder:text-muted-foreground"
                />
                <Button
                  type="submit"
                  className="rounded-l-none rounded-r-full px-6"
                >
                  Search
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold">Shop by Category</h2>
          <Link
            href="/search"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((category) => (
            <Link key={category.slug} href={`/category/${category.slug}`}>
              <Card className="group hover:shadow-md hover:border-orange-500/30 transition-all duration-300 cursor-pointer">
                <CardContent className="flex flex-col items-center justify-center p-6 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/10 to-pink-500/10 group-hover:from-orange-500/20 group-hover:to-pink-500/20 transition-colors">
                    <category.icon className="h-6 w-6 text-orange-500" />
                  </div>
                  <h3 className="font-semibold">{category.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {category.count} products
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Trending Products */}
      <section className="container py-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-pink-500">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Trending Products</h2>
              <p className="text-sm text-muted-foreground">
                Updated daily with AI-powered discovery
              </p>
            </div>
          </div>
        </div>
        <ProductGrid products={products} showRanking />
      </section>

      {/* CTA Section */}
      <section className="container py-16">
        <div className="rounded-2xl bg-gradient-to-r from-orange-500 to-pink-500 p-8 md:p-12 text-center text-white">
          <h2 className="text-2xl md:text-3xl font-bold">
            Never miss a trending deal
          </h2>
          <p className="mt-3 text-white/80 max-w-xl mx-auto">
            Our AI scans thousands of products daily to find the best trending
            deals for you.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="mt-6 bg-white text-orange-600 hover:bg-white/90"
            asChild
          >
            <Link href="/search">Explore All Products</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
