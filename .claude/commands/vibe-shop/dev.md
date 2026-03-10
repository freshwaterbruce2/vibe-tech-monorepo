---
name: vibe-shop:dev
description: Start Vibe-Shop e-commerce platform development server
model: sonnet
---

# Vibe-Shop Development Server

Start the Vibe-Shop e-commerce platform development server with hot reload.

## Steps

1. Navigate to Vibe-Shop directory:

   ```bash
   cd C:\dev\apps\vibe-shop
   ```

2. Detect framework and start appropriate server:

   ```bash
   if grep -q "\"next\":" package.json 2>/dev/null; then
     echo "Starting Next.js development server..."
     pnpm dev
   else
     echo "Starting Vite development server..."
     pnpm dev
   fi
   ```

3. Report server status:

   ```
   ✓ Vibe-Shop development server running
   → Check console output for URL (typically http://localhost:3000 or :5173)
   → E-commerce features available
   → Press Ctrl+C to stop
   ```

## Expected Output

- Server running on default port (Next.js: 3000, Vite: 5173)
- Hot Module Replacement enabled
- TypeScript compilation active
- Tailwind CSS processing
- E-commerce API endpoints accessible
