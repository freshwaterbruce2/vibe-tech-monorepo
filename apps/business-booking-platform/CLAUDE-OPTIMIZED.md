---
project_name: "Business Booking Platform"
version: "2.0.0"
status: "Production"
tech_stack:
  - "React 19"
  - "TypeScript"
  - "Vite"
  - "Express.js"
  - "Square Payment API"
  - "AI Search Integration"
primary_agent: "claude-code"
port: "3009"
database: "SQLite (production-ready)"
---

# Business Booking Platform - Claude Development Guide

**PRIMARY DIRECTIVE:** Production-ready hotel booking platform with AI-powered search, Square payments, and luxury design system. Focus on deployment simplicity following vibe-tech-lovable success pattern.

## 1. Getting Started

**Prerequisites:**

- Node.js 18+ with npm/pnpm
- Square Developer Account (payment processing)
- AI API keys for search functionality

**Installation:**

```bash
npm install               # Install dependencies
cp .env.example .env      # Configure environment
npm run setup             # Initialize database
```

**Running the App:**

```bash
npm run dev               # Vite dev server (port 3009)
npm run build             # TypeScript + Vite build
npm run test              # Vitest unit tests
```

## 2. Key Commands

- `dev`: Vite development server (port 3009)
- `build`: TypeScript compilation + Vite build
- `test`: Vitest unit tests (`test:run` for CI)
- `test:e2e`: Playwright E2E tests
- `lint`: ESLint code quality checks
- `typecheck`: TypeScript compilation check

## 3. Architecture Overview

- **Frontend:** React 19 + TypeScript + Vite with luxury design system
- **Backend:** Express.js API with Square payment integration
- **Database:** SQLite with enterprise-grade schema design
- **AI Features:** Powered search and passion-based matching

## 4. File Structure (Key Paths Only)

- `src/`: React frontend with component library
- `backend/`: Express API server
- `src/components/ui/`: Custom luxury UI components
- `src/services/`: Payment and AI integration services

## 5. Critical Rules & Patterns

- **Luxury Design System:** Maintain Marriott/Hilton visual standards
- **Square Integration:** Use official Square SDK patterns
- **AI Search:** Optimize for performance and relevance
- **Simple Deployment:** Follow vibe-tech-lovable 3-hour success pattern
- **Type Safety:** Strict TypeScript throughout application

## 6. Token Optimization Instructions for Claude

- **Be Concise:** Provide brief and direct responses.
- **Use `read_file` for context:** Before making changes, use `read_file` to understand the existing code.
- **Use `search_file_content` for discovery:** Use `search_file_content` to find relevant code snippets.
- **Limit `read_file` output:** Use the `limit` parameter with `read_file` to avoid reading large files.
- **Ask for clarification:** If the request is ambiguous, ask for clarification instead of making assumptions.
