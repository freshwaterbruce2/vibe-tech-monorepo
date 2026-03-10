---
name: iconforge:build
description: Production build with size analysis for IconForge
model: sonnet
---

# IconForge Production Build

Build IconForge for production deployment with bundle size analysis.

## Steps

1. Navigate to IconForge directory:

   ```bash
   cd C:\dev\apps\iconforge
   ```

2. Clean previous builds:

   ```bash
   rm -rf dist
   echo "✓ Cleaned previous build artifacts"
   ```

3. Run production build:

   ```bash
   pnpm build
   ```

4. Analyze bundle size:

   ```bash
   if [ -d "dist" ]; then
     echo ""
     echo "=== BUILD METRICS ==="
     du -sh dist
     echo ""
     echo "=== BUNDLE BREAKDOWN ==="
     du -h dist/assets/* 2>/dev/null | sort -hr | head -10
   fi
   ```

5. Report build success:

   ```
   ✓ IconForge production build complete
   → Output: dist/
   → Ready for deployment
   ```

## Expected Output

- Optimized JavaScript bundles in dist/assets/
- CSS extracted and minified
- Assets copied to dist/
- Source maps generated
- Build size ~500KB-2MB (typical for React + Vite)
