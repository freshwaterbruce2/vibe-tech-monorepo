---
name: vibe-shop:build
description: Production build with bundle analysis for Vibe-Shop
model: sonnet
---

# Vibe-Shop Production Build

Build Vibe-Shop e-commerce platform for production deployment.

## Steps

1. Navigate to Vibe-Shop directory:

   ```bash
   cd C:\dev\apps\vibe-shop
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
     du -h dist/assets/* 2>/dev/null | sort -hr | head -10
   elif [ -d ".next" ]; then
     du -sh .next
     du -h .next/static/chunks/* 2>/dev/null | sort -hr | head -10
   elif [ -d "out" ]; then
     du -sh out
   fi
   ```

5. Report build success:

   ```
   ✓ Vibe-Shop production build complete
   → Output directory ready for deployment
   → E-commerce features optimized
   ```

## Expected Output

- Optimized JavaScript bundles
- CSS extracted and minified
- Static assets optimized
- Image optimization applied
- Build size varies by framework (typically 1-5MB)
