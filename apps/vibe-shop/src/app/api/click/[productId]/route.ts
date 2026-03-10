import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Click tracking + redirect endpoint.
 * GET /api/click/[productId] — logs the click then redirects to the affiliate URL.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Log the click
    await prisma.click.create({
      data: {
        productId: product.id,
        referrer: request.headers.get("referer") || null,
        userAgent: request.headers.get("user-agent") || null,
        ipHash: hashIP(
          request.headers.get("x-forwarded-for") ||
            request.headers.get("x-real-ip") ||
            "unknown"
        ),
      },
    });

    // Redirect to affiliate link
    if (product.affiliateLink) {
      return NextResponse.redirect(product.affiliateLink, 302);
    }

    // No affiliate link — redirect back to product page
    return NextResponse.redirect(
      new URL(`/product/${product.id}`, request.url),
      302
    );
  } catch (error) {
    console.error("Click tracking error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/** Hash IPs for privacy — no raw IP storage */
function hashIP(ip: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + "vibe-shop-salt");
  let hash = 0;
  for (const byte of data) {
    hash = ((hash << 5) - hash + byte) | 0;
  }
  return Math.abs(hash).toString(36);
}
