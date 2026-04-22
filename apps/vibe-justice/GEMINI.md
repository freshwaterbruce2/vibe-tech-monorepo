# GEMINI.md - Vibe Justice

## Project Type
AI-powered legal document analysis web application

## Location
`C:\dev\apps\vibe-justice\`

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **AI**: Claude API (Anthropic)
- **Database**: SQLite at `D:\databases\vibe_justice.db`
- **Styling**: Tailwind + shadcn/ui

## Key Commands
```bash
pnpm dev              # Start dev server
pnpm build            # Production build
pnpm test             # Run tests
pnpm lint             # Lint code
```

## Architecture
```
src/
├── app/              # Next.js App Router
│   ├── api/          # API routes
│   │   └── analyze/  # AI analysis endpoint
│   └── cases/        # Case pages
├── components/       # React components
├── lib/
│   ├── claude.ts     # Claude API client
│   ├── db.ts         # Database client
│   └── analysis.ts   # Analysis logic
└── types/            # TypeScript types
```

## Critical Patterns

### Claude API Integration
```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export async function analyzeDocument(content: string) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: [{ role: 'user', content: prompt }]
  });
  return response.content[0].text;
}
```

### Streaming Responses
```typescript
// For long analyses, use streaming
const stream = await anthropic.messages.stream({...});
for await (const chunk of stream) {
  yield chunk.delta?.text;
}
```

## Environment Variables
```
ANTHROPIC_API_KEY=
DATABASE_URL=D:/databases/vibe_justice.db
```

## Quality Checklist
- [ ] TypeScript compiles
- [ ] API routes protected
- [ ] Claude API error handling
- [ ] Database queries optimized
- [ ] No API keys in code

## Related Skills
- Next.js patterns
- AI/LLM integration
- TypeScript expert
- Database operations
