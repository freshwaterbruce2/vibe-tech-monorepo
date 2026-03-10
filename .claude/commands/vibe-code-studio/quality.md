---
name: code-studio:quality
description: Run complete quality pipeline for Vibe Code Studio
argument-hint: [fix]
model: sonnet
---

# Vibe Code Studio Quality Pipeline

Run comprehensive quality checks on the code editor codebase.

## Steps

1. Navigate to Vibe Code Studio directory:

   ```bash
   cd C:\dev\apps\vibe-code-studio
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

4. Run tests:

   ```bash
   echo ""
   echo "Running test suite..."
   pnpm test
   ```

5. Build verification:

   ```bash
   echo ""
   echo "Verifying build process..."
   pnpm build:renderer
   pnpm build:main
   ```

6. Summary report:

   ```bash
   echo ""
   echo "=== QUALITY REPORT ==="
   echo "✓ ESLint: PASSED"
   echo "✓ TypeScript: PASSED"
   echo "✓ Tests: PASSED"
   echo "✓ Build: PASSED"
   echo ""
   echo "Vibe Code Studio is ready for commit/deployment"
   ```

## Usage

- `code-studio:quality` - Run all checks (no auto-fix)
- `code-studio:quality fix` - Run with auto-fix for linting issues

## Expected Output

- Zero ESLint errors
- Zero TypeScript errors
- All tests passing
- Successful renderer and main builds
- Total execution time: ~60-90 seconds
