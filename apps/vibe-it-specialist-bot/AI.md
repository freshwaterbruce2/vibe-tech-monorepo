# Vibe IT Specialist Bot - AI Context

## Agent Orientation
This is a Telegram bot that runs with administrator privileges to diagnose and fix issues inside the VibeTech monorepo. It has full execution access to the `C:/dev` workspace.

## Key Files & Entry Points
- [src/index.ts](file:///C:/dev/apps/vibe-it-specialist-bot/src/index.ts) — Startup script, loads local environment configuration and launches the bot.
- [src/bot.ts](file:///C:/dev/apps/vibe-it-specialist-bot/src/bot.ts) — Configures Telegraf event handlers, command routes, callbacks, and admin filters.
- [src/tasks.ts](file:///C:/dev/apps/vibe-it-specialist-bot/src/tasks.ts) — Constructs and executes tasks in the shell. Sanitizes/redacts sensitive values (tokens/secrets).
- [src/config.ts](file:///C:/dev/apps/vibe-it-specialist-bot/src/config.ts) — Parses and validates environment variables.

## Key Pathing & Directories
- Root directory: `C:/dev/apps/vibe-it-specialist-bot`
- Logs destination: `D:/logs/vibe-it-specialist-bot` (per storage rules, logs must not go to `C:/`)

## Shell Execution Rules
- The bot detects the operating system runtime.
- **Windows**: Executed using `pwsh` (PowerShell 7+), running as `pwsh -NoProfile -NonInteractive -Command "<command>"`.
- **Unix/Linux**: Executed using `bash -lc "<command>"`.
- Semicolons (`;`) are used to chain commands to maintain cross-platform shell compatibility.
