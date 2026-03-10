# Nova-Agent - Project Context

**Type**: Desktop Application (Tauri 2 + React 19)
**Agent**: desktop-expert
**Status**: Production (v1.0.0)
**Token Count**: ~600 tokens

---

## Overview

Desktop AI assistant with personal copilot features and model selection.

**Key Features**:

- Personal Copilot (AI chat interface)
- Model Selector (DeepSeek Chat, Claude, Llama, GPT-4o)
- Dashboard with system metrics
- Settings management
- Tauri 2 native Windows integration

---

## Tech Stack

**Frontend**: React 19, TypeScript 5.9+, Vite 7
**UI**: shadcn/ui, Tailwind CSS 3.4.18
**Desktop**: Tauri 2.x (Rust backend)
**State**: Zustand, TanStack Query
**AI**: OpenRouter (multi-model support)
**Database**: SQLite (`D:\databases\nova-agent.db`)

---

## Directory Structure

```
apps/nova-agent/
├── src/
│   ├── components/        # React components
│   │   ├── dashboard/     # Dashboard metrics
│   │   ├── PersonalCopilot.tsx  # Chat interface
│   │   └── ModelSelector.tsx    # Model picker
│   ├── services/          # API clients
│   │   └── openrouter.ts  # OpenRouter integration
│   ├── pages/             # App pages
│   └── types/             # TypeScript types
├── src-tauri/             # Tauri Rust backend
│   ├── src/
│   │   ├── main.rs        # Entry point
│   │   └── modules/       # Rust modules
│   └── tauri.conf.json    # Tauri config
└── package.json
```

---

## Common Workflows

### 1. OpenRouter Integration

```typescript
// Call AI model via OpenRouter
const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'deepseek/deepseek-v3.2',
    messages: [{ role: 'user', content: prompt }],
  }),
});
```

### 2. Tauri Commands (Rust ↔ React)

```rust
// src-tauri/src/main.rs
#[tauri::command]
fn get_system_info() -> SystemInfo {
    SystemInfo {
        os: std::env::consts::OS,
        arch: std::env::consts::ARCH,
    }
}
```

```typescript
// src/services/tauri.ts
import { invoke } from '@tauri-apps/api/core';

const info = await invoke<SystemInfo>('get_system_info');
```

### 3. Database Operations

```typescript
// SQLite via Tauri
import Database from '@tauri-apps/plugin-sql';

const db = await Database.load('sqlite:D:\\databases\\nova-agent.db');
const users = await db.select('SELECT * FROM users');
```

---

## Database Schema

**Path**: `D:\databases\nova-agent.db`

**Tables**:

- `settings` - User preferences
- `chat_history` - Copilot conversations
- `models` - Available AI models
- `usage_metrics` - Token usage tracking

---

## Common Issues

### Issue: Tauri build fails

**Solution**: Ensure Visual Studio Build Tools 2022 installed

```powershell
winget install Microsoft.VisualStudio.2022.BuildTools
```

### Issue: OpenRouter API timeout

**Solution**: Use proxy with retry logic

```typescript
const response = await fetchWithRetry(url, { retries: 3, timeout: 30000 });
```

### Issue: Database locked

**Solution**: Enable WAL mode in SQLite

```sql
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;
```

---

## Build & Deployment

### Development

```bash
pnpm nx dev nova-agent      # Vite dev server
pnpm tauri dev             # Tauri dev (with Rust backend)
```

### Production Build

```bash
pnpm nx build nova-agent    # Build React app
pnpm tauri build           # Create .msi installer
```

### Packaging

```bash
# Windows installer
pnpm tauri build --target msi

# Output: src-tauri/target/release/bundle/msi/nova-agent_1.0.0_x64_en-US.msi
```

---

## Anti-Duplication Checklist

Before implementing features:

1. Check `src/components/` for existing UI
2. Check `src/services/openrouter.ts` for API clients
3. Check `packages/nova-core/` for shared logic
4. Query learning DB:

   ```sql
   SELECT * FROM code_patterns WHERE file_path LIKE 'apps/nova-agent%';
   ```

---

## Integration Points

**OpenRouter Proxy**: `backend/openrouter-proxy/` (port 3001)
**Shared Core**: `packages/nova-core/` (intelligence, persistence)
**Shared Types**: `packages/nova-types/`

---

## Performance Targets

- **App Launch**: <2 seconds (cold start)
- **AI Response**: <5 seconds (DeepSeek Chat)
- **Database Query**: <100ms (with WAL mode)
- **Memory Usage**: <200 MB (idle), <500 MB (active)

---

## Critical Rules

1. **ALWAYS use Tauri 2** (NOT Electron - smaller bundle, better performance)
2. \*\*ALWAYS store data on D:\*\* (`D:\databases\nova-agent.db`)
3. **ALWAYS enable contextIsolation** (Tauri security)
4. **ALWAYS use Windows 11 native APIs** (WinRT when needed)
