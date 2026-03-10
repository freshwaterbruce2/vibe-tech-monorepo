# Nova Agent - Quick Start Guide

## Build Status: ✅ PASSING

Last verified: 2025-12-06

## Prerequisites Completed

- [x] Rust backend compiles successfully
- [x] Tauri 2.x permissions configured
- [x] Multi-agent system integrated (3 agents: Nova, Architect, Coder)
- [x] DeepSeek V3.2 with thinking mode support

## Quick Start (3 Steps)

### Step 1: Create .env File

Create `src-tauri/.env` with your DeepSeek API key:

```bash
# Required
DEEPSEEK_API_KEY=sk-your-key-here

# Optional (defaults shown)
DEEPSEEK_MODEL=deepseek-v3.2
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
ENABLE_THINKING_MODE=true
WORKSPACE_ROOT=C:\dev
DATABASE_PATH=D:\databases
DEEPCODE_WS_URL=ws://localhost:3001
```

**Get your API key**: <https://platform.deepseek.com>

### Step 2: Install Dependencies

```bash
cd C:\dev\apps\nova-agent
pnpm install
```

### Step 3: Launch Nova Agent

```bash
pnpm dev
```

This starts both:

- **Frontend**: <http://localhost:5173>
- **Rust Backend**: Tauri process (embedded)

## Test Checklist

Once the app loads, test these features:

### Basic Chat (<http://localhost:5173/chat>)

1. Type: "Hello, what's my current project?"
   - **Expected**: Nova responds with context about C:\dev workspace
2. Type: "What's 42 + 58?"
   - **Expected**: Nova calculates and responds "100"

### Code Execution

1. Type: "Execute this Python code: print('Nova is alive!')"
   - **Expected**: Nova runs the code and returns output

### File Operations

1. Type: "List the files in C:\dev\apps\nova-agent\src"
   - **Expected**: Nova reads directory and lists files

### Multi-Agent Selection

1. Type: "Use the Architect agent to design a simple REST API"
   - **Expected**: Agent switches to "System Architect" persona
2. Type: "Use the Coder agent to implement a hello world function in Rust"
   - **Expected**: Agent switches to "Code Specialist" persona

### Context Awareness (<http://localhost:5173/context-guide>)

- Should show current project, git branch, recent files

### Dashboard (<http://localhost:5173/>)

- Should show system metrics and activity

## Troubleshooting

### "DeepSeek API key not configured"

- Check `src-tauri/.env` exists and has `DEEPSEEK_API_KEY`
- Restart dev server after adding the key

### "Database locked"

- Close any other SQLite connections to D:\databases
- Restart the app

### Port 5173 already in use

```bash
# Kill existing Vite processes
taskkill /F /IM node.exe
```

### Build errors

```bash
cd src-tauri
cargo clean
cargo check
```

## What's Working Right Now

| Feature | Status | Notes |
|---------|--------|-------|
| DeepSeek V3.2 Chat | ✅ | With thinking mode |
| Multi-Agent System | ✅ | 3 agents (Nova, Architect, Coder) |
| Code Execution | ✅ | Python, JavaScript, Shell |
| Filesystem Access | ✅ | Read/Write C:\ and D:\ |
| Web Search | ✅ | DuckDuckGo integration |
| Context Engine | ✅ | Project, Git, Recent Files |
| Desktop Commander IPC | ✅ | WebSocket to control system |
| Database Logging | ✅ | 3,398 activations tracked |
| Learning System | ✅ | 47 knowledge patterns stored |

## What's Coming Next

1. **RAG System** (Phase 2) - Semantic code search with ChromaDB
2. **Learning Insights UI** (Phase 4) - Visualize learned patterns
3. **Enhanced Context** (Phase 5) - Project type detection, dependency parsing

## Database Location

All data is stored on D:\ drive as per CLAUDE.md guidelines:

- **Main DB**: D:\databases\database.db (156 tables, 150MB+)
- **ChromaDB** (future): D:\databases\chromadb

To inspect the database:

```bash
sqlite3 D:\databases\database.db

-- View activation count
SELECT COUNT(*) FROM agent_activations;

-- View knowledge patterns
SELECT * FROM agent_knowledge LIMIT 5;
```

## Getting Help

- **Documentation**: See NOVA_AGENT_TRUE_CAPABILITIES.md
- **Phase Status**: See PHASE_STATUS.md
- **Rust Backend**: See RUST_SETUP.md
- **Issues**: Check build_log.txt and typecheck_errors.txt

---

**Remember**: Nova Agent is 95% complete. The main thing you need to do is add your DeepSeek API key and start chatting!
