"use client";

import { Info, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function AffiliateDisclosure() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
      <div className="container py-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-200">
          <Info className="h-4 w-4 flex-shrink-0" />
          <p>
            <strong>Affiliate Disclosure:</strong> We may earn a commission when you purchase through our links.{" "}
            <Link
              href="/affiliate-disclosure"
              className="underline hover:no-underline"
            >
              Learn more
            </Link>
          </p>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="p-1 rounded hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
          aria-label="Dismiss disclaimer"
        >
          <X className="h-4 w-4 text-amber-800 dark:text-amber-200" />
        </button>
      </div>
    </div>
  );
}
