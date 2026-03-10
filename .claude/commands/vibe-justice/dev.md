---
name: vibe-justice:dev
description: Start Vibe-Justice frontend and backend in parallel
model: sonnet
---

# Vibe-Justice Development Server

Start the Vibe-Justice legal AI platform with frontend and backend services.

## Steps

1. Check project structure:

   ```bash
   cd C:\dev\apps\vibe-justice
   ls -la
   ```

2. Determine backend type and start:

   ```bash
   if [ -f "backend/requirements.txt" ]; then
     echo "Starting Python FastAPI backend..."
     cd backend && python -m uvicorn main:app --reload --port 8000 &
   elif [ -f "backend/package.json" ]; then
     echo "Starting Node.js backend..."
     cd backend && pnpm dev &
   else
     echo "⚠ No backend found, starting frontend only"
   fi
   ```

3. Start frontend (React + Vite):

   ```bash
   cd C:\dev\apps\vibe-justice
   pnpm dev
   ```

4. Report services:

   ```
   ✓ Vibe-Justice development servers running
   → Frontend: http://localhost:5173
   → Backend: http://localhost:8000 (if applicable)
   → Press Ctrl+C to stop
   ```

## Expected Output

- Frontend accessible on port 5173
- Backend API on port 8000 (if present)
- Hot reload enabled for both services
- Case logs stored in D:\learning-system\case-logs\
