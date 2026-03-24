---
type: ai-entrypoint
scope: project
audience:
  - gemini
status: active-development
lastReviewed: 2026-02-12
---

# GEMINI.md — AVGE Dashboard

## Project Type

Autonomous Video Generation Engine — agentic pipeline + C2 dashboard.

## Location

`C:\dev\apps\avge-dashboard\`

## Tech Stack

- **Framework**: Vite + React 19 + TypeScript
- **State**: Zustand
- **Styling**: Vanilla CSS (dark-mode, glassmorphism)
- **Pipeline**: NotebookLM MCP, Gemini 2.5 Pro, Nano Banana Pro
- **Database**: SQLite at `D:\avge\databases\avge.db`

## Key Commands

```bash
pnpm dev       # Start dev server (Vite)
pnpm build     # Production build
pnpm test      # Vitest
pnpm typecheck # tsc --noEmit
```

## Architecture

```
src/
├── pipeline/          # BLAST framework modules
│   ├── orchestrator.ts  # State machine controller
│   ├── notebook.ts      # NotebookLM MCP integration
│   ├── analysis.ts      # 3M Hook extraction
│   ├── audio.ts         # Gemini audio synthesis
│   ├── visuals.ts       # Nano Banana Pro generation
│   └── sync.ts          # 5-second chunk assembler
├── components/        # React UI
│   ├── Dashboard.tsx    # Main C2 layout
│   ├── PipelineStatus.tsx
│   ├── IntelligenceBrowser.tsx
│   ├── ChatPanel.tsx
│   └── ProjectConfig.tsx
├── stores/            # Zustand state
├── services/          # API clients
└── styles/            # Dark-mode CSS
```

## Data Paths

- **Brain Context**: `D:\avge\brain.md`
- **Source Material**: `D:\avge\raw_material\`
- **Audio Assets**: `D:\avge\assets\audio\`
- **Visual Assets**: `D:\avge\assets\visuals\`
- **Final Renders**: `D:\avge\assets\video_final\`
- **Intelligence Index**: `D:\avge\intelligence_index\`
- **Database**: `D:\avge\databases\avge.db`

## Protocol Zebra

This project is governed by Protocol Zebra. Four mandatory files at project root:

- `task_plan.md` — Phase-by-phase checklist
- `findings.md` — Research discoveries and constraints
- `progress.md` — Real-time completion status
- `GEMINI.md` — Constitutional file (this file)

**Rule**: The agent cannot modify source code without updating `task_plan.md` first.

## Critical Patterns

- **BLAST Framework**: Blueprint → Link → Architect → Style → Trigger
- **Source Grounding**: All LLM outputs verified against NotebookLM sources
- **Local-First**: All data on D:\, no cloud storage for sensitive material
- **5-Second Chunks**: Video rendered in segments for token-limit bypass

## Quality Checklist

- [ ] Vite build succeeds
- [ ] TypeScript compiles
- [ ] Dark-mode renders correctly
- [ ] NotebookLM MCP tools accessible
- [ ] Pipeline state persists to D:\avge\databases\

## Canonical References

- AI notes: AI.md
- Workspace rules: ../../docs/ai/WORKSPACE.md
