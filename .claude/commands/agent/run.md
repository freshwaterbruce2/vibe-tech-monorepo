Run an Agent SDK agent from the agent-sdk-workspace.

## Available Agents

- **code-reviewer** - Autonomous code review across changed files. Analyzes diffs and file contents for bugs, security issues, and anti-patterns.
- **quality-gate** - Runs lint, typecheck, and build checks. On failure, uses AI to analyze errors and suggest fixes.

## Steps

1. Navigate to the agent workspace:
   ```
   cd C:\dev\apps\agent-sdk-workspace
   ```

2. Install dependencies if not already installed:
   ```
   pnpm install
   ```

3. Run the specified agent:
   ```
   pnpm tsx src/agents/$ARGUMENTS.ts
   ```

4. Report the agent's findings.

## Arguments

Pass the agent name and optional arguments:
- `code-reviewer [base-branch]` - Review code vs a branch (default: main)
- `quality-gate [project|affected]` - Run quality checks (default: affected)

## Examples

- `/agent:run code-reviewer` - Review changes vs main
- `/agent:run code-reviewer develop` - Review changes vs develop
- `/agent:run quality-gate` - Run quality checks on affected projects
- `/agent:run quality-gate vibe-tutor` - Run quality checks on specific project

## Requirements

- `ANTHROPIC_API_KEY` environment variable must be set
