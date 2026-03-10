---
name: invoice:dev
description: Start Invoice Automation SaaS development server
model: sonnet
---

# Invoice Automation Development Server

Start the Invoice Automation SaaS platform development server with hot reload.

## Steps

1. Navigate to Invoice Automation directory:

   ```bash
   cd C:\dev\apps\invoice-automation-saas
   ```

2. Install dependencies if needed:

   ```bash
   if [ ! -d "node_modules" ]; then
     echo "Installing dependencies..."
     pnpm install
   fi
   ```

3. Start development server:

   ```bash
   pnpm dev
   ```

4. Report server status:

   ```
   ✓ Invoice Automation development server running
   → Check console output for URL
   → Invoice processing features available
   → Press Ctrl+C to stop
   ```

## Expected Output

- Development server on default port
- Hot Module Replacement enabled
- TypeScript compilation active
- Tailwind CSS processing
- Invoice PDF generation ready
- Email integration available (if configured)
