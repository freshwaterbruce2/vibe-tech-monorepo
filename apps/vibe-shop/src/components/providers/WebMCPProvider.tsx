'use client';

import { useEffect } from 'react';
// eslint-disable-next-line @nx/enforce-module-boundaries -- same-app import via the '@/' alias; the rule misreads it as cross-app
import { initWebMCPTools } from '@/lib/webmcp.tools';

export function WebMCPProvider() {
  useEffect(() => {
    // Only run on the client side
    initWebMCPTools();
  }, []);

  return null;
}
