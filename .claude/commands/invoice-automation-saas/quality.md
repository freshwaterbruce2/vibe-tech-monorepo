---
name: invoice:quality
description: Run complete quality pipeline for Invoice Automation
argument-hint: [fix]
model: sonnet
---

# Invoice Automation Quality Pipeline

Run comprehensive quality checks on the Invoice Automation SaaS codebase.

## Steps

1. Navigate to Invoice Automation directory:

   ```bash
   cd C:\dev\apps\invoice-automation-saas
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
   echo "Invoice Automation is ready for commit/deployment"
   ```

## Usage

- `invoice:quality` - Run all checks (no auto-fix)
- `invoice:quality fix` - Run with auto-fix for linting issues

## Expected Output

- Zero ESLint errors
- Zero TypeScript errors
- Successful production build
- Invoice features verified
- Total execution time: ~30-60 seconds
