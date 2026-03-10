import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { Activity, BarChart3, Package, TrendingUp } from "lucide-react";

export const revalidate = 0; // Always fresh

export async function StatsCards() {
  const [productCount, trendCount, categoryCount, clickCount] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.trendingKeyword.count(),
    prisma.category.count(),
    prisma.click.count(),
  ]);

  const cards = [
    {
      title: "Active Products",
      value: productCount,
      icon: Package,
      desc: "Live in store"
    },
    {
      title: "Trending Keywords",
      value: trendCount,
      icon: TrendingUp,
      desc: "Tracked daily"
    },
    {
      title: "Categories",
      value: categoryCount,
      icon: BarChart3,
      desc: "Active categories"
    },
    {
      title: "Total Clicks",
      value: clickCount,
      icon: Activity,
      desc: "Affiliate clicks"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {card.title}
            </CardTitle>
            <card.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{card.value}</div>
            <p className="text-xs text-muted-foreground">
              {card.desc}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
