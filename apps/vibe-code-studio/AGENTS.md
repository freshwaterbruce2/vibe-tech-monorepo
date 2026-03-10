# Vibe Code Studio - Agent Guidelines

This file provides guidance for AI agents (Claude, GPT, etc.) working with the Vibe Code Studio codebase.

## Local + GitHub Workflow Rule

- Treat the local working tree as the canonical source of truth.
- Prefer local execution, local validation, and local artifacts over hosted workflows.
- Prefer GitHub when remote hosting guidance is needed.
- GitHub PR/Actions/`gh` flows are available when needed.

## 🔑 Bruce's Configuration Rules

**CRITICAL**: Bruce uses **OpenRouter exclusively** for all AI models. Never suggest or configure direct provider API keys (DeepSeek, Anthropic, OpenAI, etc.).

### OpenRouter-Only Setup

- **Single API Key**: `VITE_OPENROUTER_API_KEY` only
- **Proxy Required**: OpenRouter proxy must run on `http://localhost:3001`
- **Default Model**: `deepseek-chat` (DeepSeek V3.2 - #1 for coding on OpenRouter, Jan 2026)
- **All Providers**: OpenAI, Anthropic, Groq, Perplexity, Together, Ollama route through OpenRouter
- **NO HuggingFace**: HuggingFace models have been removed from the registry

See `BRUCE_OPENROUTER_CONFIG.md` for complete setup details.

## Architecture Overview

Vibe Code Studio is an AI-powered code editor built as an Electron application with React frontend.

### Core Stack

- **Frontend**: React 19 + TypeScript + styled-components
- **Editor**: Monaco Editor (VS Code engine)
- **Desktop**: Electron 39
- **Build**: Vite + electron-vite
- **AI**: OpenRouter (unified access to all models)
- **Database**: better-sqlite3 (D:\ drive only)

### Key Services

#### AI Services

- **UnifiedAIService**: Main AI orchestrator (uses AIProviderFactory)
- **AIProviderFactory**: Multi-provider management (OpenRouter, DeepSeek, Google, Local)
- **TaskPlanner**: Breaks down user requests into executable steps
- **ExecutionEngine**: Executes agent tasks with approval gates
- **AutoFixService**: Automatic error detection and fixing

#### Core Services

- **FileSystemService**: File operations (browser and Electron)
- **WorkspaceService**: Project indexing and analysis
- **GitService**: Git integration
- **DatabaseService**: SQLite database (D:\databases\vibe_apex.db)

## Development Commands

```bash
# Install dependencies
pnpm install

# Rebuild native modules (after Electron version change)
pnpm run rebuild-deps

# Development
pnpm run dev              # Full dev environment
pnpm run dev:web          # Web only (port 3001)

# Build
pnpm run build            # TypeScript + production bundle
pnpm run package          # Create distributable

# Quality
pnpm run typecheck        # TypeScript checking
pnpm run lint             # ESLint
pnpm run test             # Vitest
```

## Critical File Locations

### AI Configuration

- `src/services/ai/UnifiedAIService.ts` - Main AI service
- `src/services/ai/AIProviderFactory.ts` - Provider management
- `src/services/ai/AIProviderInterface.ts` - Model registry
- `src/app/hooks/useAppEffects.ts` - Provider initialization

### Service Initialization

- `src/modules/core/hooks/useAppServices.ts` - Service instantiation
- `src/app/hooks/useAppState.ts` - App state management

### Database

- `src/services/DatabaseService.ts` - Database operations
- `electron/database-handler.ts` - Electron IPC for database

## Common Issues & Solutions

### Issue: "Provider not initialized"

**Cause**: Selected model's provider isn't configured
**Solution**: 

1. Check OpenRouter proxy is running on port 3001
2. Verify `VITE_OPENROUTER_API_KEY` in `.env`
3. Restart the app

### Issue: "better-sqlite3 MODULE_VERSION mismatch"

**Cause**: Native module compiled for wrong Node.js version
**Solution**: Run `pnpm run rebuild-deps`

### Issue: "setTaskContext is not a function"

**Cause**: ExecutionEngine not properly instantiated
**Solution**: Check `useAppServices.ts` - should use `new ExecutionEngine(...)` not `{} as any`

## Code Style Guidelines

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier (2-space indent, single quotes)
- **Linting**: ESLint with React/TypeScript rules
- **Naming**: 
  - PascalCase for components/classes
  - camelCase for functions/variables
  - kebab-case for files/folders

## Testing Requirements

- **Minimum Coverage**: 50% overall
- **Critical Paths**: 80% coverage
- **New Features**: Must include tests
- **Test Framework**: Vitest with jsdom

## Important Notes

1. **Database Location**: ALL databases MUST be on D:\ drive (never C:\)
2. **API Keys**: Only OpenRouter key needed (no direct provider keys)
3. **Native Modules**: Rebuild after Electron version changes
4. **Service Initialization**: Always use proper constructors (never `{} as any`)
5. **Model Selection**: Default to `gpt-5` via OpenRouter

## Agent Workflow

When making changes:

1. **Understand**: Use `codebase-retrieval` to find relevant code
2. **Plan**: Use task management tools for complex work
3. **Verify**: Check dependencies and imports before editing
4. **Edit**: Use `str-replace-editor` (never recreate files)
5. **Test**: Run `pnpm run typecheck` and `pnpm test`
6. **Document**: Update this file if architecture changes

## Resources

- **Full Setup**: See `BRUCE_OPENROUTER_CONFIG.md`
- **Build Guide**: See `BUILD_SUCCESS_REPORT.md`
- **Architecture**: See `ARCHITECTURE.md`
- **Claude Guide**: See `CLAUDE.md`

---

**Last Updated**: January 2026
**Maintained By**: Bruce + AI Agents
**Status**: Production Ready ✅

