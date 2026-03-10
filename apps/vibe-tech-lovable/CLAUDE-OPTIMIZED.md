---
project_name: "Vibe-Tech Lovable"
version: "1.0.0"
status: "Development"
tech_stack:
  - "React 18.3.1"
  - "TypeScript"
  - "Vite"
  - "shadcn/ui"
  - "Express.js 4.21.2"
  - "SQLite3"
primary_agent: "claude-code"
port: "8080"
database: "SQLite (D:\vibe-tech-data\vibetech.db)"
---

# Vibe-Tech Lovable - Claude Development Guide

**PRIMARY DIRECTIVE:** Modern React/TypeScript portfolio with full-stack architecture. Use shadcn/ui components, React Query for state, and maintain compatibility with original Vibe-Tech database schema.

## 1. Getting Started

**Prerequisites:**

- Node.js 18+ with npm
- SQLite3 database setup
- D: drive access for database persistence

**Installation:**

```bash
npm i                     # Install frontend dependencies
cd backend && npm i       # Install backend dependencies
```

**Running the App:**

```bash
npm run dev               # Frontend (port 8080)
cd backend && npm run dev # Backend API (port 3002)
```

## 2. Key Commands

**Frontend (from project root):**

- `dev`: Start frontend dev server (port 8080)
- `build`: Production build
- `preview`: Preview production build
- `test`: Playwright E2E tests

**Backend (from backend/ directory):**

- `dev`: Start Express API server with nodemon (port 3002)
- `start`: Production server
- `prod`: Production server with NODE_ENV=production

## 3. Architecture Overview

- **Frontend:** React 18.3.1 + Vite + shadcn/ui + React Three Fiber
- **Backend:** Express.js 4.21.2 with SQLite3 persistence
- **Database:** SQLite (D:\vibe-tech-data\vibetech.db) - shared schema with main Vibe-Tech

## 4. File Structure (Key Paths Only)

- `src/`: React frontend application
- `backend/`: Express.js API server
- `src/components/ui/`: shadcn/ui component library
- `src/components/three/`: React Three Fiber 3D components

## 5. Critical Rules & Patterns

- **shadcn/ui Components:** Use exclusively for UI primitives
- **React Query:** For all server state management
- **Database Compatibility:** Maintain schema compatibility with main Vibe-Tech
- **Port Configuration:** Frontend 8080, Backend 3002 (avoid conflicts)
- **3D Performance:** Optimize React Three Fiber components for performance

## 6. Token Optimization Instructions for Claude

- **Be Concise:** Provide brief and direct responses.
- **Use `read_file` for context:** Before making changes, use `read_file` to understand the existing code.
- **Use `search_file_content` for discovery:** Use `search_file_content` to find relevant code snippets.
- **Limit `read_file` output:** Use the `limit` parameter with `read_file` to avoid reading large files.
- **Ask for clarification:** If the request is ambiguous, ask for clarification instead of making assumptions.
