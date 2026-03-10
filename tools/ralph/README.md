# Project Health Scanner

> Built with the Ralph autonomous coding methodology

## What It Does

Scans your monorepo and generates a prioritized "finish list" by analyzing:

- **Staleness** — Days since last source file modification
- **TODO Count** — Unresolved TODO/FIXME/HACK comments
- **Test Coverage** — Whether tests exist
- **Documentation** — README presence
- **Size** — Lines of source code

Higher health score = needs more attention.

## Quick Start

```powershell
# From C:\dev\ralph
python -m src                      # Console output
python -m src --output markdown    # Save to C:\dev\PROJECT_HEALTH.md
python -m src --top 10             # Top 10 projects only
python -m src --output both        # Both console and markdown
```

## Options

| Flag | Description | Default |
|------|-------------|---------|
| `--path PATH` | Root path to scan | `C:\dev` |
| `--output FORMAT` | `console`, `markdown`, or `both` | `console` |
| `--top N` | Show only top N projects | all |
| `--markdown-path PATH` | Custom path for markdown output | `ROOT\PROJECT_HEALTH.md` |

## Example Output

```
PROJECT HEALTH REPORT
Scanned: C:\dev
Found: 44 projects

PROJECT                        TYPE      SCORE  STALE  TODOs  TESTS    LINES
--------------------------------------------------------------------------------
vibe-justice                   node       40.0     0d   3281   Yes  2193070
nova-database                  node       37.2    49d      3    No      306
logger                         node       35.4    49d      0    No       99
```

## Scoring Formula

```
Score = (Staleness × 0.4) + (TODOs × 0.3) + (No Tests × 0.2) + (No README × 0.1)
```

- Staleness capped at 365 days, scaled 0-100
- TODOs capped at 50, scaled 0-100
- Boolean penalties: 100 if missing, 0 if present

## Performance

- **4.6 seconds** for full monorepo scan (44 projects)
- Skips: node_modules, .venv, **pycache**, .git, dist, build

## Files

```
ralph/
├── src/
│   ├── __init__.py      # Package marker
│   ├── __main__.py      # CLI entry point
│   ├── models.py        # Data classes
│   ├── scanner.py       # Project discovery
│   ├── scorer.py        # Health scoring
│   └── output.py        # Console/markdown formatters
├── specs/               # Requirements (Ralph methodology)
├── _backups/            # Manual zip backups
├── AGENTS.md            # Operational learnings
├── PROMPT_build.md      # Build loop protocol
├── PROMPT_plan.md       # Planning mode protocol
└── IMPLEMENTATION_PLAN.md  # Task tracking
```

## Ralph Methodology

This project was built using the "Ralph" autonomous coding methodology:

1. **Orient** — Read specs and plan
2. **Select** — Pick ONE task
3. **Implement** — Write code
4. **Validate** — Run it (backpressure)
5. **Update** — Mark complete, capture learnings
6. **Repeat**

14 tasks completed in 8 iterations (~15 minutes total).
