# Learning Patterns — Error Prevention & Self-Improvement

How the VibeTech ecosystem tracks mistakes, learns from successes, and gets better over time.
Read this file when logging outcomes, diagnosing recurring failures, or running system health checks.

## Table of Contents

1. The Error Prevention Loop
2. Logging Failures
3. Logging Successes
4. Querying Past Lessons
5. Self-Improvement Triggers
6. Health Checks & Maintenance

---

## 1. The Error Prevention Loop

Before every non-trivial task, run a pre-flight check:

```
memory_search_unified({
  query: "<brief description of what you're about to do>",
  limit: 5
})
```

If hits come back with category "error" or "failure", read them carefully. They contain:
- **What went wrong** — the symptom
- **Root cause** — why it happened
- **Fix** — what resolved it
- **Prevention** — how to avoid it next time

Apply the prevention step to your current approach. If the memory says "don't use npm install
in this context, use pnpm --filter", then do that. The whole point is to not make the same
mistake twice.

---

## 2. Logging Failures

When something goes wrong — a build fails, a type error appears, a file gets corrupted, a
skill produces bad output — log it immediately:

```
memory_add_semantic({
  content: "FAILURE: [what happened — be specific]\nAREA: [web|desktop|backend|mobile|data|infra]\nCAUSE: [root cause — why it happened, not just what]\nFIX: [exact steps that resolved it]\nPREVENTION: [what to do differently next time]",
  metadata: {
    category: "error",
    area: "<affected area>",
    severity: "<low|medium|high|critical>",
    tags: ["<relevant-tags>"]
  }
})
```

**Severity guide:**
- **Critical**: Data loss, corrupted database, broken production app
- **High**: Build won't complete, app crashes, wrong data served
- **Medium**: Type errors, lint failures, incorrect output format
- **Low**: Style issues, minor inefficiencies, suboptimal approach

**Example:**
```
FAILURE: pnpm-lock.yaml corrupted after running npm install in nova-agent
AREA: infra
CAUSE: npm and pnpm lock file formats are incompatible — npm overwrites the lock
FIX: Deleted node_modules and pnpm-lock.yaml, ran pnpm install --filter @vibetech/nova-agent
PREVENTION: NEVER run npm in this monorepo. Always use pnpm with --filter flag.
```

---

## 3. Logging Successes

When something works well — especially if it was non-obvious, creative, or solved a hard
problem — track the pattern:

```
memory_track_pattern({
  pattern: "<concise description of what worked>",
  context: "<what problem it solved, what app/area>",
  category: "<web|desktop|backend|mobile|data|infra|skill>"
})
```

Also log proven-effective code as episodic memory:

```
memory_add_episodic({
  content: "SUCCESS: [what was accomplished]\nAPPROACH: [how it was done]\nTIME: [how long it took]\nREUSABLE: [yes/no — can this approach be templated?]",
  metadata: {
    category: "success",
    area: "<affected area>"
  }
})
```

**What to track as patterns:**
- Build configurations that work on first try
- Skill invocation sequences that produce great results
- Code scaffolding patterns (component structure, API route patterns)
- Debug approaches that quickly found root cause
- Nx generator commands with specific flags that worked

---

## 4. Querying Past Lessons

### Find errors in a specific area
```
memory_search_semantic({
  query: "failures in backend API",
  limit: 10
})
```

### Find what worked for a similar task
```
memory_get_patterns({
  category: "web",
  limit: 5
})
```

### Find everything from a time period
```
memory_search_timerange({
  start: "2026-03-01",
  end: "2026-04-01",
  limit: 20
})
```

### Get AI-powered suggestions
```
memory_suggest_task({
  task: "Create a new Vite app with auth and SQLite backend"
})
```

This returns recommendations based on past patterns, known pitfalls, and proven approaches.

---

## 5. Self-Improvement Triggers

The system should actively look for opportunities to improve. These triggers indicate it's
time to create or update a skill, pattern, or tool:

### "I keep doing the same thing" → Create a skill
If you find yourself repeating a multi-step workflow more than twice, that's a skill waiting
to be born. Use the `skill-creator` skill to formalize it.

### "This skill didn't help" → Improve the skill
If a skill triggers but produces mediocre results, log it as feedback and either:
- Update the skill yourself if the fix is obvious
- Use `skill-creator` to run the full improvement loop

### "There's no MCP for this" → Build one
If a task requires accessing an external service repeatedly and no MCP exists:
1. Check `search_mcp_registry` first — maybe one exists
2. If not, use `mcp-builder` skill to create one

### "The monorepo is drifting" → Run maintenance
If you notice config inconsistencies, outdated deps, or pattern drift across apps:
- Trigger `monorepo-maintenance` skill
- Run `pnpm run quality` across affected apps
- Log what was out of alignment in memory

### "Memory is getting stale" → Consolidate
If memory queries return contradictory or outdated results:
```
memory_conflict_check()
memory_consolidate_preview()   # See what would be merged
memory_consolidate()           # Execute the merge
```

---

## 6. Health Checks & Maintenance

Run these periodically (weekly, or when things feel off):

### Memory System Health
```
memory_health()                # Overall status
memory_learning_health()       # Learning agent status
memory_decay_stats()           # Are old memories being pruned?
memory_rag_index_status()      # Is RAG index current?
```

### Monorepo Health
Via Desktop Commander:
```powershell
cd C:\dev; pnpm run quality    # Full lint + typecheck + build
npx.cmd nx graph               # Dependency visualization
npx.cmd nx affected --all      # What's changed since last check
```

### Database Health
```
sqlite: list_tables            # What tables exist?
sqlite: read_query "SELECT name, type FROM sqlite_master ORDER BY name"
```

### Pattern Review
```
memory_get_patterns({ limit: 20 })    # What are we tracking?
memory_summarize_stats()               # Summary of all memory
```

If health checks reveal problems, fix them and log the fix as a lesson learned.
