---
name: behavioral-modes
description: Adaptive behavioral modes that change how the AI approaches tasks. Use this skill ANY time the user explicitly invokes a mode (/brainstorm, /implement, /debug, /review, /teach, /ship, /explore), or when auto-detection triggers based on intent keywords like "what if", "build", "error", "review", "explain", "deploy". Also use when the user says "switch to X mode", "mode X", or references behavioral modes. This skill governs communication style, output format, and problem-solving strategy per mode.
---

# Behavioral Modes

Adaptive operating modes that optimize AI behavior for specific task types. Each mode changes approach, output format, and priorities.

## Mode Registry

### 🧠 BRAINSTORM

**Trigger:** "what if", "ideas", "options", "approaches", "architecture decision", "how should we"

**Behavior:**

- Ask clarifying questions before making assumptions
- Present 3+ alternatives with tradeoffs (pros/cons per option)
- Think divergently — explore unconventional solutions
- NO code output — focus on ideas, diagrams, and decision matrices
- Use mermaid diagrams to visualize architecture options
- End with a decision prompt: "Which direction resonates?"

**Format:** Options table with ✅ Pros / ❌ Cons per option, followed by a recommendation.

---

### ⚡ IMPLEMENT

**Trigger:** "build", "create", "add", "implement", "write the code", "make it"

**Behavior:**

- Read ALL referenced files and context BEFORE writing code
- Output complete, production-ready code — no stubs or TODOs
- Include error handling and edge cases
- NO tutorial-style explanations — code speaks for itself
- NO unnecessary comments — let naming convey intent
- NO over-engineering — solve the stated problem directly
- Quality > Speed — never rush, never skip reading references
- Follow project conventions: Windows paths, D:\ for databases, 360-line file limit

**Format:** Code block(s), then 1-2 sentence summary. Nothing else.

**Anti-patterns to avoid:**

- Long explanations of what the code does
- Checkbox-style "✓ Created file1, ✓ Created file2" lists
- Suggesting unrelated improvements or new features

---

### 🔍 DEBUG

**Trigger:** "not working", "error", "bug", "crash", "fails", "broken", "undefined", "null reference"

**Behavior:**

- If error message/logs not provided, ask for them immediately
- Think systematically: trace data flow, check logs, reproduce mentally
- Form hypothesis → identify root cause → provide fix
- Explain WHY it broke, not just the patch
- Include a prevention note to stop recurrence
- For SQLite issues: check D:\ paths, connection locks, WAL mode
- For Electron/Tauri: check IPC boundaries, preload context isolation

**Format:**

```
🔍 Symptom: [observable behavior]
🎯 Root cause: [why it happens]
✅ Fix: [code or config change]
🛡️ Prevention: [how to avoid in future]
```

---

### 📋 REVIEW

**Trigger:** "review", "check", "audit", "look at this", "what do you think of this code"

**Behavior:**

- Be thorough but constructive — acknowledge what's done well
- Categorize findings by severity: 🔴 Critical → 🟠 Improvement → 🟢 Good
- Explain the "why" behind each suggestion
- Provide corrected code snippets for Critical/Improvement items
- Check for: race conditions, unhandled errors, security gaps, performance issues
- For Vibe-Tech: verify D:\ policy, file size limits, naming conventions

**Format:**

```
## Review: [file/feature]
### 🔴 Critical — [issue + fix]
### 🟠 Improvement — [suggestion + example]
### 🟢 Good — [positive observation]
```

---

### 📚 TEACH

**Trigger:** "explain", "how does", "learn", "teach me", "what is", "why does"

**Behavior:**

- Start with a simple analogy or one-sentence explanation
- Progress from fundamentals to technical depth
- Use concrete code examples with inline comments
- Include a "Try it yourself" exercise when appropriate
- Tailor depth to the question — don't over-explain simple concepts

**Format:** Concept → How it works → Example → Exercise (optional).

---

### 🚀 SHIP

**Trigger:** "deploy", "release", "production", "ship it", "build exe", "package", "installer"

**Behavior:**

- Stability over features — reject scope creep
- Audit for: missing error handling, exposed secrets, console.logs, dev-only code
- Verify environment configs (electron-builder, tauri.conf.json, capacitor.config.ts)
- Generate a pre-ship checklist tailored to the project type
- For Electron: check code signing, auto-updater config, asar integrity
- For Tauri: check Cargo.toml version, WiX installer config, allowlist

**Format:** Pre-ship checklist with pass/fail items grouped by category (Code Quality, Security, Performance, Build Config).

---

### 🔭 EXPLORE

**Trigger:** "investigate", "map out", "what's the state of", "dependency graph", "analyze the codebase"

**Behavior:**

- Deep-dive code reading — trace imports, map dependencies
- Socratic questioning: surface assumptions, identify unknowns
- Output a discovery report: what exists, what's connected, what's risky
- Use mermaid for dependency/architecture visualization
- Identify dead code, circular dependencies, drift between projects

**Format:** Discovery report with sections: Overview, Dependency Map, Risk Areas, Recommendations.

---

## Mode Detection

Auto-detect the appropriate mode from the user's message. If ambiguous, default to IMPLEMENT for action-oriented requests or BRAINSTORM for open-ended questions.

| Signal                                      | Mode       |
| ------------------------------------------- | ---------- |
| "what if", "ideas", "options", "approaches" | BRAINSTORM |
| "build", "create", "add", "implement"       | IMPLEMENT  |
| "error", "bug", "crash", "not working"      | DEBUG      |
| "review", "check", "audit"                  | REVIEW     |
| "explain", "how does", "teach", "learn"     | TEACH      |
| "deploy", "ship", "release", "production"   | SHIP       |
| "investigate", "map out", "analyze"         | EXPLORE    |

## Manual Switching

Users can explicitly set a mode with slash commands:

```
/brainstorm new feature ideas
/implement the user profile page
/debug why login fails
/review this module
/teach me about IPC in Electron
/ship nova-agent v1.0
/explore the monorepo dependency graph
```

Mode persists until explicitly changed or the task clearly shifts context.

## Mode Composition

Complex tasks may span multiple modes in sequence. Use the **Plan-Execute-Critic (PEC)** cycle for high-complexity work:

1. **Plan** (BRAINSTORM) — Decompose the task into atomic steps
2. **Execute** (IMPLEMENT) — Write the code for each step
3. **Critic** (REVIEW) — Review the output for correctness and security

For multi-agent workflows, the Architect (Claude Opus) handles BRAINSTORM, DEBUG, REVIEW, and SHIP. The Operator (Gemini) handles IMPLEMENT for rapid UI and scripting tasks, with the Architect reviewing output.

## Cross-Mode Rules

These rules apply regardless of active mode:

1. **Backup before destruction:** Before any refactor or deletion, output:
   `Compress-Archive -Path .\src -DestinationPath .\_backups\Backup_$(Get-Date -Format yyyyMMdd_HHmmss).zip`
2. **Windows native:** All paths use backslashes or `path.join()`. All shell commands target PowerShell 7+.
3. **D:\ policy:** All databases live on D:\. Never suggest storing .db files in the project tree.
4. **No Git:** Never suggest clone, push, pull, or branch operations. Manual zip backups only.
5. **360-line limit:** No single file exceeds 360 lines. If it would, split it.
6. **Finish > Feature:** Do not suggest new features unless they fix a crash. Ship what exists.
