---
name: iconforge:dev
description: Start IconForge development server with Vite
model: sonnet
---

# IconForge Development Server

Start the IconForge icon creation platform development server with hot reload.

## Steps

1. Navigate to IconForge directory:

   ```bash
   cd C:\dev\apps\iconforge
   ```

2. Install dependencies if needed:

   ```bash
   if [ ! -d "node_modules" ]; then
     echo "Installing dependencies..."
     pnpm install
   fi
   ```

3. Start Vite dev server:

   ```bash
   pnpm dev
   ```

4. Report server status:

   ```
   ✓ IconForge development server running
   → URL: http://localhost:5173
   → Press Ctrl+C to stop
   ```

## Expected Output

- Server should start on port 5173 (or next available port)
- Hot Module Replacement (HMR) enabled
- TypeScript compilation in watch mode
- Tailwind CSS processing active
