---
name: code-studio:test
description: Run unit tests and E2E tests for Vibe Code Studio
model: sonnet
---

# Vibe Code Studio Test Suite

Run comprehensive test suite including unit tests and end-to-end tests.

## Steps

1. Navigate to Vibe Code Studio directory:

   ```bash
   cd C:\dev\apps\vibe-code-studio
   ```

2. Run unit tests (Vitest):

   ```bash
   echo "Running unit tests..."
   pnpm test:unit
   ```

3. Run E2E tests (Playwright):

   ```bash
   if grep -q "\"test:e2e\":" package.json 2>/dev/null; then
     echo ""
     echo "Running E2E tests..."
     pnpm test:e2e
   else
     echo ""
     echo "⚠ E2E tests not configured"
   fi
   ```

4. Generate coverage report:

   ```bash
   if grep -q "\"test:coverage\":" package.json 2>/dev/null; then
     echo ""
     echo "Generating coverage report..."
     pnpm test:coverage
   fi
   ```

5. Report test results:

   ```bash
   echo ""
   echo "=== TEST SUMMARY ==="
   echo "✓ Unit tests completed"
   if grep -q "\"test:e2e\":" package.json 2>/dev/null; then
     echo "✓ E2E tests completed"
   fi
   if grep -q "\"test:coverage\":" package.json 2>/dev/null; then
     echo "→ Coverage report: coverage/index.html"
   fi
   ```

## Expected Output

- Unit test results with pass/fail status
- E2E test results (if configured)
- Code coverage metrics (if generated)
- Test execution time
- Failed test details (if any)
