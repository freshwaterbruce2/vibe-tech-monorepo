# Prompt Engineer

A full-stack micro app for optimizing AI prompts based on target model capabilities and best practices.

## Features

- **Multi-Model Support**: Claude 4.5 (Opus/Sonnet/Haiku), DeepSeek V3.2 (Chat/Reasoner), Gemini (3 Pro/2.5 Flash/2.5 Pro)
- **Mode-Specific Optimization**: Plan, Edit, Review, Ask modes with tailored prompt guidelines
- **Extended Thinking**: Toggle chain-of-thought reasoning (uses DeepSeek R1 Reasoner)
- **Streaming Responses**: Real-time streaming of optimized prompts
- **History**: Last 50 prompts stored with client-side search
- **Rate Limiting**: 10 requests/minute with countdown timer UI

## Quick Start

### 1. Set up environment

```powershell
# Backend
cd backend/prompt-engineer
cp .env.example .env
# Edit .env and add your DEEPSEEK_API_KEY

# Frontend (uses Vite proxy, no env needed for dev)
cd apps/prompt-engineer
```

### 2. Install dependencies

```powershell
# From repo root
pnpm install

# Or individually
cd apps/prompt-engineer && pnpm install
cd backend/prompt-engineer && pnpm install
```

### 3. Start development servers

```powershell
# Terminal 1: Backend (port 3002)
cd backend/prompt-engineer
pnpm dev

# Terminal 2: Frontend (port 5173)
cd apps/prompt-engineer
pnpm dev
```

### 4. Open the app

Navigate to <http://localhost:5173>

## Architecture

```
apps/prompt-engineer/          # React frontend
├── src/
│   ├── components/           # UI components
│   │   ├── ui/              # shadcn/ui primitives
│   │   ├── ModelSelector    # Target model dropdown
│   │   ├── ModeSelector     # Mode dropdown
│   │   ├── ThinkingToggle   # Extended thinking switch
│   │   ├── PromptEditor     # Input/output textareas
│   │   └── HistoryPanel     # History sidebar with search
│   ├── hooks/
│   │   ├── useOptimize      # API call with streaming + rate limit
│   │   ├── useLocalStorage  # Persist preferences
│   │   └── useToast         # Toast notifications
│   ├── config/models.ts     # Model definitions
│   └── types/index.ts       # TypeScript types

backend/prompt-engineer/       # Express backend
├── src/
│   ├── config/models.json   # Model + mode configurations
│   ├── routes/
│   │   ├── optimize.ts      # POST /api/optimize (streaming)
│   │   └── history.ts       # GET/POST/DELETE /api/history
│   └── server.ts            # Express app with rate limiting
```

## API Endpoints

### POST /api/optimize

Optimize a prompt for the target model and mode.

**Request:**

```json
{
  "prompt": "Original prompt text",
  "model": "claude-sonnet-4-5",
  "mode": "edit",
  "extendedThinking": false
}
```

**Response:** Server-Sent Events (SSE) stream

### GET /api/history

Get the last 50 optimized prompts.

### POST /api/history

Save a new history item.

### DELETE /api/history/:id

Delete a specific history item.

### DELETE /api/history

Clear all history.

## Storage

- **History**: `D:\data\prompt-engineer\history.json` (50 items max)
- **Preferences**: localStorage (model, mode, thinking toggle)

## Rate Limiting

- 10 requests per minute on `/api/optimize`
- `Retry-After` header returned on 429
- Frontend shows countdown timer and disables button

## Tech Stack

**Frontend:**

- React 19 + TypeScript 5.9+
- Vite
- Tailwind CSS
- shadcn/ui (Radix primitives)
- lucide-react icons

**Backend:**

- Express + TypeScript
- express-rate-limit
- DeepSeek API (deepseek-chat / deepseek-reasoner)
