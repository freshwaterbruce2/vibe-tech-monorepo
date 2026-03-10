import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import type { Product } from "@/types";
import { ExternalLink, TrendingUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface ProductCardProps {
  product: Product;
  rank?: number;
}

export function ProductCard({ product, rank }: ProductCardProps) {
  const trendBadgeColor =
    product.trendScore >= 80 ? "bg-red-500" :
    product.trendScore >= 60 ? "bg-orange-500" :
    product.trendScore >= 40 ? "bg-yellow-500" :
    "bg-green-500";

  return (
    <Card className="group overflow-hidden hover:shadow-lg transition-all duration-300">
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {rank && rank <= 3 && (
          <div className="absolute top-2 left-2 z-10">
            <Badge className={`${rank === 1 ? 'bg-yellow-500' : rank === 2 ? 'bg-gray-400' : 'bg-amber-600'} text-white`}>
              #{rank}
            </Badge>
          </div>
        )}

        {product.trendScore >= 70 && (
          <div className="absolute top-2 right-2 z-10">
            <Badge className={`${trendBadgeColor} text-white flex items-center gap-1`}>
              <TrendingUp className="h-3 w-3" />
              Hot
            </Badge>
          </div>
        )}

        <Link href={`/product/${product.id}`}>
          <Image
            src={product.imageUrl || "/placeholder.svg"}
            alt={product.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        </Link>
      </div>

      <CardContent className="p-4">
        {/* Merchant */}
        <p className="text-xs text-muted-foreground mb-1">
          {product.merchantName}
        </p>

        {/* Product Name */}
        <Link href={`/product/${product.id}`}>
          <h3 className="font-medium line-clamp-2 min-h-[2.5rem] group-hover:text-orange-500 transition-colors">
            {product.name}
          </h3>
        </Link>

        {/* Price */}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-xl font-bold">
            ${product.price.toFixed(2)}
          </span>
          {product.currency !== 'USD' && (
            <span className="text-sm text-muted-foreground">
              {product.currency}
            </span>
          )}
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button asChild className="w-full group/btn">
          <a
            href={`/api/click/${product.id}`}
            target="_blank"
            rel="noopener noreferrer sponsored"
          >
            View Deal
            <ExternalLink className="ml-2 h-4 w-4 group-hover/btn:translate-x-1 transition-transform" />
          </a>
        </Button>
      </CardFooter>
    </Card>
  );
}
