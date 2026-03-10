---
name: memory:quality
description: Run complete quality pipeline for Memory Bank
argument-hint: [fix]
model: sonnet
---

# Memory Bank Quality Pipeline

Run comprehensive quality checks on the Memory Bank backend codebase.

## Steps

1. Navigate to Memory Bank directory:

   ```bash
   cd C:\dev\apps\memory-bank
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

4. Run tests (if available):

   ```bash
   if grep -q "\"test\":" package.json 2>/dev/null; then
     echo ""
     echo "Running tests..."
     pnpm test
   fi
   ```

5. Summary report:

   ```bash
   echo ""
   echo "=== QUALITY REPORT ==="
   echo "✓ ESLint: PASSED"
   echo "✓ TypeScript: PASSED"
   if grep -q "\"test\":" package.json 2>/dev/null; then
     echo "✓ Tests: PASSED"
   fi
   echo ""
   echo "Memory Bank is ready for commit/deployment"
   ```

## Usage

- `memory:quality` - Run all checks (no auto-fix)
- `memory:quality fix` - Run with auto-fix for linting issues

## Expected Output

- Zero ESLint errors
- Zero TypeScript errors
- All tests passing (if present)
- Memory operations verified
- Total execution time: ~20-40 seconds
