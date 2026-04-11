# avge-dashboard — AI Context

## What this is
AVGE (AI Video Generation Engine) command-and-control dashboard — planned Vite + React UI for managing a multi-pipeline AI video production system (NotebookLM, Gemini audio, avatar generation).

## Stack
- **Runtime**: Node.js 22 (planned)
- **Framework**: Vite + React + TypeScript (planned; not yet scaffolded)
- **Key deps**: Zustand, React Router (planned per task_plan.md)

## Dev
```bash
# App not yet scaffolded — see task_plan.md (Protocol Zebra phases)
pnpm --filter avge-dashboard dev    # will start Vite once scaffolded
pnpm --filter avge-dashboard build  # will produce dist/
```

## Notes
- Currently only contains `task_plan.md` — no source code exists yet
- Phase 1 (scaffold) is still in progress per the task plan
- Planned data directory: `D:\avge\` for pipeline state and outputs
- Once scaffolded, will have four panels: Pipeline Status, Intelligence Browser, RAG Chat, Project Config
