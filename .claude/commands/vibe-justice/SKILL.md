---
name: vibe-justice-skill
description: Web application development - Next.js, AI integration, case management
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# Vibe Justice Web Application Skill

> **AI-Powered Case Management** - Next.js, Claude API, Document Processing

## Project Context

| Aspect        | Details                                  |
| ------------- | ---------------------------------------- |
| **Location**  | `C:\dev\apps\vibe-justice`               |
| **Framework** | Next.js 14 (App Router)                  |
| **AI**        | Claude API via Anthropic SDK             |
| **Database**  | SQLite at `D:\databases\vibe_justice.db` |
| **Styling**   | Tailwind CSS, shadcn/ui                  |

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind
- **Backend**: Next.js API Routes, Server Actions
- **AI Integration**: Anthropic Claude SDK
- **Document Processing**: PDF parsing, OCR
- **State**: Zustand + React Query

## Required Community Skills

| Skill                   | Use Case               |
| ----------------------- | ---------------------- |
| `nextjs-best-practices` | App Router patterns    |
| `typescript-expert`     | Type safety            |
| `llm-app-patterns`      | Claude API integration |
| `react-patterns`        | Component design       |
| `systematic-debugging`  | Bug investigation      |

## Architecture

```
vibe-justice/
├── src/
│   ├── app/
│   │   ├── (public)/       # Public pages
│   │   ├── (dashboard)/    # Protected routes
│   │   └── api/            # API routes
│   ├── components/
│   │   ├── ui/             # Base components
│   │   ├── case/           # Case management
│   │   └── ai/             # AI chat components
│   ├── lib/
│   │   ├── claude.ts       # Claude client
│   │   └── db.ts           # Database client
│   └── services/
│       ├── case-service.ts
│       └── ai-service.ts
└── next.config.js
```

## Development Workflow

### Start Development

```bash
cd apps/vibe-justice
pnpm dev
```

### Run Tests

```bash
pnpm test
pnpm test:e2e
```

## Critical Patterns

### Claude API Integration

```typescript
// lib/claude.ts
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function analyzeCase(caseText: string): Promise<CaseAnalysis> {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Analyze this legal case and provide:
1. Key issues
2. Relevant precedents
3. Recommended actions

Case: ${caseText}`,
      },
    ],
  });

  return parseCaseAnalysis(response.content[0].text);
}
```

### Streaming AI Response

```typescript
// app/api/chat/route.ts
export async function POST(req: Request) {
  const { messages, caseId } = await req.json();

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: getSystemPrompt(caseId),
    messages,
  });

  return new Response(stream.toReadableStream(), {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}
```

## Quality Checklist

- [ ] TypeScript compiles: `pnpm typecheck`
- [ ] Lint passes: `pnpm lint`
- [ ] Tests pass: `pnpm test`
- [ ] AI responses validated
- [ ] Error handling for API failures
- [ ] Loading states implemented

## Related Commands

- `/vibe-justice:dev` - Start development
- `/vibe-justice:quality` - Full quality pipeline
- `/vibe-justice:logs` - Check application logs
