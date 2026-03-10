---
name: memory:dev
description: Start Memory Bank backend service
model: sonnet
---

# Memory Bank Development Server

Start the Memory Bank backend service for memory management operations.

## Steps

1. Navigate to Memory Bank directory:

   ```bash
   cd C:\dev\apps\memory-bank
   ```

2. Ensure database exists:

   ```bash
   if [ ! -d "D:\databases" ]; then
     mkdir -p D:\databases
     echo "✓ Created databases directory"
   fi
   ```

3. Install dependencies if needed:

   ```bash
   if [ ! -d "node_modules" ]; then
     echo "Installing dependencies..."
     pnpm install
   fi
   ```

4. Start backend service:

   ```bash
   pnpm dev
   ```

5. Report server status:

   ```
   ✓ Memory Bank backend service running
   → Check console output for port (typically :3000 or :8000)
   → Database: D:\databases\memory-bank.db
   → Memory operations ready
   → Press Ctrl+C to stop
   ```

## Expected Output

- Backend API server running
- Database connection established
- Memory CRUD operations available
- Session management active
- Log file created at D:\logs\memory-bank.log
