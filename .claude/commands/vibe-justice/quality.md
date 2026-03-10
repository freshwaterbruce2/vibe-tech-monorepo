---
name: vibe-justice:quality
description: Run complete quality pipeline for Vibe-Justice
argument-hint: [fix]
model: sonnet
---

# Vibe-Justice Quality Pipeline

Run comprehensive quality checks on the legal AI platform codebase.

## Steps

1. Navigate to Vibe-Justice directory:

   ```bash
   cd C:\dev\apps\vibe-justice
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
   echo "Vibe-Justice is ready for commit/deployment"
   ```

## Usage

- `vibe-justice:quality` - Run all checks (no auto-fix)
- `vibe-justice:quality fix` - Run with auto-fix for linting issues

## Expected Output

- Zero ESLint errors
- Zero TypeScript errors
- Successful production build
- Legal AI features verified working
- Total execution time: ~30-60 seconds
