---
name: invoice:build
description: Production build for Invoice Automation SaaS
model: sonnet
---

# Invoice Automation Production Build

Build Invoice Automation SaaS platform for production deployment.

## Steps

1. Navigate to Invoice Automation directory:

   ```bash
   cd C:\dev\apps\invoice-automation-saas
   ```

2. Clean previous builds:

   ```bash
   rm -rf dist .next out
   echo "✓ Cleaned previous build artifacts"
   ```

3. Run production build:

   ```bash
   pnpm build
   ```

4. Analyze bundle size:

   ```bash
   echo ""
   echo "=== BUILD METRICS ==="
   if [ -d "dist" ]; then
     du -sh dist
     echo ""
     echo "=== BUNDLE BREAKDOWN ==="
     du -h dist/assets/* 2>/dev/null | sort -hr | head -10
   elif [ -d ".next" ]; then
     du -sh .next
     du -h .next/static/chunks/* 2>/dev/null | sort -hr | head -10
   fi
   ```

5. Report build success:

   ```
   ✓ Invoice Automation production build complete
   → Output directory ready for deployment
   → Invoice processing features optimized
   → PDF generation verified
   ```

## Expected Output

- Optimized JavaScript bundles
- CSS extracted and minified
- Static assets optimized
- Invoice templates compiled
- Build size typically 1-3MB
- PDF generation libraries included
