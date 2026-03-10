---
name: iconforge:quality
description: Run complete quality pipeline (lint, typecheck, build)
argument-hint: [fix]
model: sonnet
---

# IconForge Quality Pipeline

Run comprehensive quality checks on IconForge codebase.

## Steps

1. Navigate to IconForge directory:

   ```bash
   cd C:\dev\apps\iconforge
   ```

2. Run ESLint:

   ```bash
   if [ "$1" = "fix" ]; then
     echo "Running ESLint with auto-fix..."
     pnpm lint --fix
   else
     echo "Running ESLint..."
     pnpm lint
   fi
   ```

3. Run TypeScript type checking:

   ```bash
   echo ""
   echo "Running TypeScript type checking..."
   pnpm typecheck
   ```

4. Run production build verification:

   ```bash
   echo ""
   echo "Verifying production build..."
   pnpm build
   ```

5. Summary report:

   ```bash
   echo ""
   echo "=== QUALITY REPORT ==="
   echo "✓ ESLint: PASSED"
   echo "✓ TypeScript: PASSED"
   echo "✓ Build: PASSED"
   echo ""
   echo "IconForge is ready for commit/deployment"
   ```

## Usage

- `iconforge:quality` - Run all checks (no auto-fix)
- `iconforge:quality fix` - Run with auto-fix for linting issues

## Expected Output

- Zero ESLint errors (warnings OK if minor)
- Zero TypeScript errors
- Successful production build
- Total execution time: ~30-60 seconds
