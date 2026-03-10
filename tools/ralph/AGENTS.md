# AGENTS.md — Operational Learnings

> Auto-updated during Ralph iterations. Contains Windows-specific commands, project quirks, and lessons learned.

## Windows PowerShell Commands

- **Command chaining:** Use `;` not `&&` in PowerShell
  - Wrong: `cd folder && python script.py`
  - Right: `Set-Location folder; python script.py`

- **Run Python module:** `python -m src` from project root

- **Measure execution time:** `Measure-Command { python -m src } | Select-Object TotalSeconds`

- **Backup command:**

  ```powershell
  Compress-Archive -Path .\src -DestinationPath ".\_backups\Backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').zip"
  ```

## Project-Specific Quirks

### C:\dev Monorepo

- **44 projects** across apps/ and packages/
- Most packages/ lack tests (nova-*, shared-*)
- `SKIP_DIRS` must include: node_modules, .venv, **pycache**, .git, .nx, dist, dist_final, build, .pnpm, _internal, vendor, out, .next, .output

### False Positive Lesson (vibe-justice)

- Initial scan showed 3281 TODOs and 2.1M lines
- **Cause:** Bundled PyTorch in `dist_final\_internal\torch\`
- **Fix:** Added `dist_final`, `.pnpm`, `_internal` to SKIP_DIRS
- **Actual stats:** 0 TODOs, 15K lines, score 10.0 (healthy)

### Scanner Performance

- Full scan completes in ~4.6 seconds
- Bottleneck is file I/O, not computation
- Reading file bytes for TODO search is faster than line-by-line

## Lessons Learned

### Iteration 1

- Entry point structure: `src\__init__.py` + `src\__main__.py`
- Module runs with `python -m src` from project root

### Iteration 2

- Python 3.11+ union syntax `datetime | None` works in dataclasses
- `@dataclass` with `field(default_factory=list)` for mutable defaults

### Iteration 3

- `os.walk()` with `dirs[:] = [...]` modifies walk in-place (prunes directories)
- Reading bytes (`read_bytes()`) is faster than text for counting

### Iteration 4

- Scoring normalization: cap values to prevent outliers from dominating
- Weight tuning: staleness (0.4) matters most for "needs attention"

### Iteration 5

- ANSI colors work in PowerShell 7+ and Windows Terminal
- Use `\033[0m` to reset formatting

### Iteration 6

- argparse `type=Path` auto-converts strings to Path objects
- Default paths should use raw strings: `r"C:\dev"`

### Iteration 7

- `Measure-Command` is PowerShell's built-in profiler
- 4.6s for 44 projects = ~100ms per project average

## Ralph Methodology Observations

1. **Planning Mode** generated 14 tasks from 1 spec in ~2 minutes
2. **Backpressure** (running the code) caught issues immediately
3. **Single-task focus** prevented scope creep
4. **AGENTS.md accumulation** captures reusable knowledge
5. **Total time:** ~15 minutes from empty directory to working tool
