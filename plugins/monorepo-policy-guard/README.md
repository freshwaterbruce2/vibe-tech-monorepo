# monorepo-policy-guard

Policy-oriented Claude Code plugin for VibeTech workspace conventions:

- Code artifacts stay in `V:\monorepo`
- Runtime data stays on `D:\` (`databases`, `logs`, `learning-system`, memory)
- Memory Bank updates stay consistent across sessions

## Features

### Commands

| Command | Description |
|---|---|
| `/monorepo-policy-guard:policy-check <path> [--intent code|data|logs|db|memory]` | Validate whether a path follows workspace policy |
| `/monorepo-policy-guard:memory-bank-check [--scope root|app] [--project <name>]` | Review Memory Bank completeness and list missing/stale files |
| `/monorepo-policy-guard:session-handoff [--task "<summary>"] [--project <name>]` | Prepare next-session handoff updates for active context/progress |

### Hook

- `PreToolUse` warning hook that flags likely code-writing activity to `D:\` or outside `V:\monorepo`.
- Non-blocking by default (warns, does not prevent execution).

## Installation

### One-off run

```bash
claude --plugin-dir V:\monorepo\plugins\monorepo-policy-guard
```

### Persistent install

Add this plugin directory to your Claude Code plugin configuration so it loads automatically in future sessions.

### Update

Pull latest changes in `V:\monorepo\plugins\monorepo-policy-guard` and restart Claude Code.

### Uninstall

Remove the plugin path from Claude Code plugin configuration, or stop passing `--plugin-dir` for one-off runs.

## Prerequisites

- Claude Code with local plugin support
- Workspace policy in effect:
  - Code under `V:\monorepo`
  - Runtime data on `D:\`

## Usage

### Validate a target path

```text
/monorepo-policy-guard:policy-check V:\monorepo\apps\nova-agent --intent code
```

### Check Memory Bank status

```text
/monorepo-policy-guard:memory-bank-check --scope root
```

### Prepare session handoff

```text
/monorepo-policy-guard:session-handoff --task "Finished auth refactor for command-center"
```

## Policy Baseline

- Allowed code root: `V:\monorepo`
- Reserved data root: `D:\`
- Approved `D:\` data areas:
  - `D:\databases`
  - `D:\logs`
  - `D:\learning-system`

## Structure

```text
monorepo-policy-guard/
  .claude-plugin/plugin.json
  commands/
    policy-check.md
    memory-bank-check.md
    session-handoff.md
  hooks/
    hooks.json
  .gitignore
  README.md
```

## Troubleshooting

- Command not visible: verify plugin path points to `V:\monorepo\plugins\monorepo-policy-guard`.
- No hook warning appears: confirm plugin loaded successfully and the action targets a path outside policy.
- Memory check false positives: validate that your project-specific Memory Bank structure matches the configured core file set.
