# Vibe Code Studio - AI Agent Instructions

A production-ready AI-powered code editor built with Electron + React + TypeScript, designed as a cost-effective alternative to Cursor IDE using DeepSeek AI integration.

## 🎯 Architecture Overview

**Electron-based Desktop Application** with React 19 frontend:

- **Frontend**: React 19 + TypeScript 5.9 + styled-components 6.x
- **Editor**: Monaco Editor (VS Code engine)
- **Desktop**: Electron 39 with custom preload/main process
- **AI**: DeepSeek API (3 models: chat, coder, reasoner)
- **State**: Zustand for global state + React hooks for local
- **Build**: electron-vite + Vite 7 with optimized chunking
- **Package Manager**: pnpm (lockfile present; `npm run ...` scripts also supported)

### Critical Design Pattern: Service Layer Isolation

**NEVER put business logic in components** - all logic lives in services:

```typescript
// ✅ Correct: Service handles logic
src/services/WorkspaceService.ts      // Project indexing & analysis
src/services/DeepSeekService.ts       // Direct AI API calls
src/services/ai/UnifiedAIService.ts   // Orchestrates all AI interactions
src/services/FileSystemService.ts     // Cross-platform file operations
src/services/specialized-agents/      // Multi-agent system (7 agents)
```

**Multi-Agent Orchestration** (`AgentOrchestrator.ts`):

- 7 specialized agents: TechnicalLead, Frontend, Backend, Performance, Security, SuperCoder
- Task-based routing with capability matching
- Parallel execution with performance tracking
- Used via `AgentMode` in AIChat component (Ctrl+Shift+A)

### Path Aliases (Critical for Imports)

**Always use TypeScript path aliases** - defined in `tsconfig.json`:

```typescript
import { UnifiedAIService } from '@/services/ai/UnifiedAIService'
import type { EditorFile, AIMessage } from '@/types'
import { useWorkspace } from '@/hooks/useWorkspace'
// Also available: @components/*, @services/*, @utils/*, @electron/*
```

## 🔧 Critical Developer Workflows

### Development Commands (Windows PowerShell)

```powershell
# Primary development modes
npm run dev                    # Electron dev mode (main + renderer)
npm run dev:web               # Web-only preview mode (port 3002) - for UI testing
npm run electron:dev          # Alias for 'dev'

# Build commands
npm run build                 # Build renderer + main process
npm run build:production      # Optimized production build
npm run electron:build:win    # Build + package Windows installer (NSIS + portable)
npm run package              # Package without installer (testing)

# Quality checks
npm run lint                 # ESLint (max-warnings=0, strict)
npm run lint:fix             # Auto-fix imports and formatting
npm run typecheck            # TypeScript type check (strict mode)
npm run test                 # Vitest unit tests
npm run test:e2e             # Playwright E2E tests

# Development automation hooks
npm run hook:test-watch      # Auto-run tests on file changes (recommended!)
npm run hook:memory-watch    # Monitor memory usage during dev
npm run hook:performance     # Capture performance metrics
```

### Code Quality Automation

**Note**: Git hooks not currently active. Run quality checks manually before committing code.

**Manual quality check workflow**:

```powershell
# Run all quality checks before committing
npm run lint              # ESLint (--max-warnings 0)
npm run typecheck         # TypeScript strict checks
npm test                  # Unit tests
npm run format:check      # Prettier validation

# Auto-fix issues
npm run lint:fix          # Fix ESLint + organize imports
npm run format            # Auto-format with Prettier
```

**Configured for future git integration** (`.lintstagedrc.js`):

- ESLint with `--fix` and `--max-warnings 0` (zero tolerance)
- Prettier formatting
- Import sorting (via ESLint)
- package.json sorting (sort-package-json)
- Tests NOT included (too slow for pre-commit)

### Build Architecture (electron-vite)

**Three separate build targets** in `electron.vite.config.ts`:

1. **Main Process** (`electron/main.ts` → `out/main/index.cjs`)
   - CommonJS format for native module compatibility (better-sqlite3, node-pty)
   - Externalizes native modules that can't bundle
   
2. **Preload Script** (`electron/preload.ts` → `out/preload/index.js`)
   - IPC bridge between renderer and main
   
3. **Renderer** (React app via `vite.config.ts` → `dist/`)
   - Code splitting: `react-vendor`, `monaco`, `ai-utils` chunks
   - Compression: gzip + brotli
   - Monaco workers handled automatically by `@monaco-editor/react`

### Testing Strategy

**Current Coverage**: ~28% (27 test files for 95 source files)
**Target**: >50% coverage

**Test Organization** (`src/__tests__/`):

- Mirrors `src/` directory structure
- **Priority**: Services first, then critical components
- **Framework**: Vitest + jsdom + @testing-library/react
- **Mocks**: Shared mocks in `src/__tests__/mocks/`

**Run specific tests**:

```bash
npx vitest run src/__tests__/services/MyService.test.ts
npx vitest watch  # Watch mode for TDD
```

## 🚀 AI Integration Deep Dive

### Unified Chat Interface (Core Feature)

**Three modes in one sidebar** (`src/components/AIChat/`):

```typescript
type ChatMode = 'chat' | 'agent' | 'composer'
// 'chat': Normal conversational AI (default)
// 'agent': 7-phase autonomous coding with multi-agent orchestration (Ctrl+Shift+A)
// 'composer': Multi-file editing workflow (streaming code changes)
```

**Agent Mode Phases** (see `src/services/ai/ExecutionEngine.ts`):

1. Planning → 2. Analysis → 3. Design → 4. Implementation → 5. Testing → 6. Review → 7. Refinement

### AI Service Architecture

**Call hierarchy** (always follow this pattern):

```
Component (AIChat/Editor)
  ↓
UnifiedAIService.getInstance()  // Singleton orchestrator
  ↓
DeepSeekService                // Direct API calls
  ↓
DeepSeek API (streaming SSE)
```

**Context Building** (`WorkspaceService.ts`):

- Indexes entire workspace on open (file graph, dependencies, symbols)
- Provides related files context to AI (smart context window management)
- Used by: code completion, chat, agent mode

### Model Selection

**3 DeepSeek models** available via `ModelSelector` component:

- `deepseek-chat` (default): Fast general-purpose coding
- `deepseek-coder`: Specialized for complex code generation
- `deepseek-reasoner`: Chain-of-thought reasoning (64K context, 32K output)

**Set in environment**:

```env
VITE_DEEPSEEK_MODEL=deepseek-reasoner  # Override default
VITE_DEEPSEEK_API_KEY=sk-...
VITE_DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
```

## 🏗️ Project Structure Conventions

### Component Organization

**Modular components** (avoid monolithic files):

```
src/components/
├── AIChat/               # Modular: types, styled, useChatState, MessageItem, StepCard
│   └── index.tsx        # Re-exports for backward compatibility
├── Editor.tsx           # Monaco wrapper with AI completion provider
├── Sidebar.tsx          # File explorer with virtual scrolling (VirtualFileTree)
├── ErrorBoundary/       # ModernErrorBoundary with recovery UI
└── LazyComponents.tsx   # Code-split heavy components (Settings, GitPanel)
```

**File length target**: <400 LOC per file - split if larger.

### Service Layer Rules

**Always use FileSystemService** for cross-platform file ops:

```typescript
// ✅ Cross-platform (works in Electron + browser fallback)
import { fileSystemService } from '@/services/FileSystemService'
await fileSystemService.readFile(path)
await fileSystemService.writeFile(path, content)

// ❌ NEVER use Node.js fs directly (breaks browser mode)
import fs from 'fs'  // ❌ Will fail in renderer process
```

**Service singleton pattern** (most services):

```typescript
export class MyService {
  private static instance: MyService
  
  public static getInstance(): MyService {
    if (!MyService.instance) {
      MyService.instance = new MyService()
    }
    return MyService.instance
  }
  
  private constructor() { /* init */ }
}
```

### File Naming Conventions

- **Components**: PascalCase (`.tsx` extension)
  - `AIChat.tsx`, `ModelSelector.tsx`, `CommandPalette.tsx`
- **Services**: PascalCase (`.ts` extension)
  - `DeepSeekService.ts`, `WorkspaceService.ts`
- **Hooks**: camelCase with `use` prefix (`.ts` or `.tsx`)
  - `useWorkspace.ts`, `useAIChat.ts`
- **Types**: PascalCase interfaces (`EditorFile`, `AIMessage`, `ChatMode`)
- **Utilities**: camelCase (`.ts`)
  - `errorHandler.ts`, `logger.ts`

### Type Safety (Strict Mode)

**TypeScript strict mode enabled** (`tsconfig.json`):

```json
"strict": true,
"noImplicitAny": true,
"strictNullChecks": true,
"strictFunctionTypes": true
```

**No `any` types allowed** - use proper types or `unknown` with type guards.

## 🔍 Key Integration Points

### Electron IPC Communication

**Preload script** exposes safe IPC methods (`electron/preload.ts`):

```typescript
// In preload:
contextBridge.exposeInMainWorld('electron', {
  readFile: (path) => ipcRenderer.invoke('read-file', path)
})

// In renderer:
if (window.electron) {
  const content = await window.electron.readFile(path)
}
```

**Check Electron availability**:

```typescript
const isElectron = !!window.electron
// Use FileSystemService which handles this internally
```

### Monaco Editor Integration

**Setup** (`src/components/Editor.tsx`):

- Uses `@monaco-editor/react` (not raw monaco-editor)
- Workers loaded automatically (NO manual worker config needed)
- AI completion provider registered on mount
- Custom themes and languages via Monaco API

**AI Completion**:

```typescript
monaco.languages.registerInlineCompletionsProvider('typescript', {
  provideInlineCompletions: async (model, position) => {
    // Calls UnifiedAIService with context
  }
})
```

### Error Handling Strategy

**Wrap async operations in ModernErrorBoundary**:

```typescript
<ModernErrorBoundary>
  <ComponentWithAsyncOps />
</ModernErrorBoundary>
```

**Services return errors** (don't throw unless critical):

```typescript
async someOperation(): Promise<{ success: boolean; error?: string }> {
  try {
    // ...
    return { success: true }
  } catch (err) {
    return { success: false, error: getUserFriendlyError(err) }
  }
}
```

## 📋 Development Best Practices

### State Management Rules

**Zustand for global app state**:

- Editor settings, workspace context, open files, current file
- Located in `src/hooks/useApp*.ts` files

**React hooks for local UI state**:

- Modal open/close, form input, loading states
- Keep in component or extract to custom hook

### Performance Patterns

**Virtual scrolling** for large lists:

- File tree: `VirtualFileTree.tsx` component
- Uses `react-window` for efficient rendering

**Code splitting**:

- Heavy components lazy-loaded in `LazyComponents.tsx`
- Vite automatically chunks by vendor (React, Monaco, AI utils)

**Memoization**:

```typescript
const expensiveValue = useMemo(() => computeValue(), [deps])
const memoizedCallback = useCallback(() => { /* ... */ }, [deps])
```

### Async/Streaming Patterns

**AI streaming** (Server-Sent Events):

```typescript
// In service
async *streamResponse(prompt: string): AsyncGenerator<string> {
  const response = await fetch(url, { /* SSE config */ })
  const reader = response.body.getReader()
  
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    yield decodeChunk(value)
  }
}

// In component
for await (const chunk of service.streamResponse(prompt)) {
  setMessage(prev => prev + chunk)
}
```

## ⚠️ Critical Constraints

1. **Strict TypeScript**: No `any` types - fails build
2. **ESLint Zero Warnings**: Pre-commit enforces `--max-warnings 0`
3. **Cross-Platform Paths**: Always use `/` (forward slash) - FileSystemService normalizes
4. **Monaco in Separate Chunk**: Don't import Monaco in main bundle (large)
5. **AI Token Limits**: DeepSeek context windows vary by model (respect limits)
6. **Electron Security**: No `nodeIntegration: true` - use IPC bridge only

## 🚨 Common Pitfalls

- **❌ Don't** import Node.js built-ins in renderer (use services)
- **❌ Don't** call AI APIs directly from components (use UnifiedAIService)
- **❌ Don't** forget error boundaries around async/AI operations
- **❌ Don't** hardcode file paths - use ProjectStructureDetector or workspace context
- **❌ Don't** mutate state directly in Zustand stores (use immer or return new object)
- **✅ Do** use FileSystemService for all file operations
- **✅ Do** wrap AI calls in try-catch with user-friendly error messages
- **✅ Do** test in both Electron and web modes (`npm run dev` vs `npm run dev:web`)

## 📚 Essential Documentation Files

**Read these for deep context**:

- [CLAUDE.md](../CLAUDE.md) - Detailed AI development guidelines (MCP integration, session init)
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture, module system, AI integration
- [BUILD_CONFIG_SUMMARY.md](../BUILD_CONFIG_SUMMARY.md) - Build process, packaging, installers
- [package.json](../package.json) - All scripts, dependencies (pnpm workspace)
- [electron.vite.config.ts](../electron.vite.config.ts) - Electron build configuration
- [vite.config.ts](../vite.config.ts) - Renderer build configuration

**Key entry points**:

- `src/App.tsx` - Main React app orchestrator (service init, state management)
- `electron/main.ts` - Electron main process (window management, IPC handlers)
- `electron/preload.ts` - IPC bridge (context bridge API)

Focus on understanding the service layer architecture and multi-agent system before making changes.

---

## 🛠️ Common Tasks & Examples

### How to Add a New Specialized Agent

**1. Create agent class** extending `BaseSpecializedAgent`:

```typescript
// src/services/specialized-agents/MyNewAgent.ts
import { DeepSeekService } from '../DeepSeekService';
import { 
  AgentCapability, 
  AgentContext, 
  AgentResponse, 
  BaseSpecializedAgent 
} from './BaseSpecializedAgent';

export class MyNewAgent extends BaseSpecializedAgent {
  constructor(deepSeekService: DeepSeekService) {
    super(
      'MyNewAgent',
      [
        AgentCapability.CODE_GENERATION,
        AgentCapability.CODE_REVIEW,
        // Add relevant capabilities
      ],
      deepSeekService
    );
  }

  getRole(): string {
    return 'My Agent Role';
  }

  getSpecialization(): string {
    return 'Specific focus area and expertise';
  }

  protected generatePrompt(request: string, context: AgentContext): string {
    return `As a ${this.getRole()}, analyze:

${request}

Context:
- Current file: ${context.currentFile || 'N/A'}
- Project type: ${context.projectType || 'Unknown'}
- Selected text: ${context.selectedText || 'None'}

Provide detailed analysis and recommendations.`;
  }

  protected analyzeResponse(response: string, context: AgentContext): AgentResponse {
    return {
      content: response,
      confidence: 0.85,
      reasoning: 'Analysis based on...',
      performance: {
        processingTime: Date.now(),
        memoryUsage: 0,
        apiCalls: 1,
        cacheHits: 0,
        tokenCount: response.length / 4
      }
    };
  }

  // Add specialized methods
  async mySpecializedTask(context: AgentContext): Promise<AgentResponse> {
    const request = 'Task-specific request';
    return this.process(request, context);
  }
}
```

**2. Register in AgentOrchestrator**:

```typescript
// src/services/specialized-agents/AgentOrchestrator.ts
import { MyNewAgent } from './MyNewAgent';

private initializeAgents(): void {
  const agentConfigs = [
    // ... existing agents
    { key: 'my_new_agent', AgentClass: MyNewAgent }
  ];
  
  // Rest of initialization...
}
```

**3. Export in module index** (if needed):

```typescript
// src/services/specialized-agents/index.ts
export { MyNewAgent } from './MyNewAgent';
```

### How to Add a New Service

**1. Create service file** with singleton pattern:

```typescript
// src/services/MyService.ts
import { logger } from './Logger';

export class MyService {
  private static instance: MyService;
  private initialized = false;

  private constructor() {}

  public static getInstance(): MyService {
    if (!MyService.instance) {
      MyService.instance = new MyService();
    }
    return MyService.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      // Setup logic
      logger.info('[MyService] Initialized');
      this.initialized = true;
    } catch (error) {
      logger.error('[MyService] Initialization failed', error);
      throw error;
    }
  }

  // Public methods
  async doSomething(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
    // Implementation
  }
}

// Export singleton instance
export const myService = MyService.getInstance();
```

**2. Initialize in App.tsx**:

```typescript
// src/app/hooks/useAppEffects.ts
import { myService } from '@/services/MyService';

useEffect(() => {
  const initServices = async () => {
    await myService.initialize();
  };
  initServices();
}, []);
```

### How to Add a Component with Proper Patterns

**1. Create modular component structure**:

```
src/components/MyFeature/
├── index.tsx          # Re-exports
├── types.ts           # TypeScript interfaces
├── styled.ts          # Styled components
├── useMyFeature.ts    # State management hook
└── MyFeature.tsx      # Main component
```

**2. Component implementation**:

```typescript
// src/components/MyFeature/MyFeature.tsx
import { memo, useCallback } from 'react';
import { Container, Button } from './styled';
import { useMyFeature } from './useMyFeature';
import type { MyFeatureProps } from './types';

export const MyFeature = memo<MyFeatureProps>(({ onComplete }) => {
  const { state, handleAction } = useMyFeature();

  const handleClick = useCallback(() => {
    handleAction();
    onComplete?.();
  }, [handleAction, onComplete]);

  return (
    <Container>
      <Button onClick={handleClick}>Action</Button>
    </Container>
  );
});

MyFeature.displayName = 'MyFeature';
```

**3. Export in index.tsx**:

```typescript
// src/components/MyFeature/index.tsx
export { MyFeature } from './MyFeature';
export type { MyFeatureProps } from './types';
```

---

## 🔌 MCP (Model Context Protocol) Integration

### Overview

**MCP enables AI agents to access external tools and data sources**. The `MCPService` manages connections to MCP servers that provide:

- **Tools**: Executable functions (file operations, API calls, calculations)
- **Resources**: Data sources (documents, databases, APIs)
- **Prompts**: Reusable prompt templates

### Architecture

```typescript
// MCP is Electron/Desktop-only (requires Node.js child_process)
MCPService
  ↓
connects to → MCP Servers (spawned processes)
  ↓
provides → Tools, Resources, Prompts
  ↓
used by → AI agents via UnifiedAIService
```

### Configuration

**MCP servers defined in user settings** (example):

```typescript
// User's MCP config
{
  mcpServers: {
    "filesystem": {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-filesystem", "C:\\projects"],
      env: {}
    },
    "github": {
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-github"],
      env: { GITHUB_TOKEN: "ghp_xxx" }
    }
  }
}
```

### Using MCP in Services

```typescript
import { MCPService } from '@/services/MCPService';

// Initialize
const mcpService = new MCPService(config);

// Check availability (false in web mode)
if (!mcpService.isAvailable()) {
  console.log('MCP only works in Electron/Desktop mode');
  return;
}

// Connect to server
await mcpService.connectServer('filesystem');

// List available tools
const tools = await mcpService.listTools('filesystem');
// Returns: [{ name: 'read_file', description: '...', inputSchema: {...} }]

// Call tool
const result = await mcpService.callTool('filesystem', 'read_file', {
  path: '/path/to/file.ts'
});

// Access resources
const resources = await mcpService.listResources('github');
const fileContent = await mcpService.readResource('github', 'repo://owner/repo/README.md');

// Use prompts
const prompts = await mcpService.listPrompts('github');
const prompt = await mcpService.getPrompt('github', 'create-pr', {
  title: 'Fix bug',
  description: 'Bug fix details'
});
```

### Platform Detection

**MCP gracefully degrades in web mode**:

```typescript
// In MCPService.ts
const isDesktopEnvironment = (() => {
  if (typeof window !== 'undefined') {
    // Check for Electron
    if (window.electronAPI || window.electron?.isElectron) {
      return true;
    }
    // Browser - no MCP
    return false;
  }
  // Node.js environment
  return true;
})();
```

**Usage pattern**:

```typescript
if (mcpService.isAvailable()) {
  // Use MCP features
  await mcpService.connectServer('filesystem');
} else {
  // Fallback to built-in FileSystemService
  await fileSystemService.readFile(path);
}
```

### MCP Integration in AI Workflow

**AI agents can discover and use MCP tools dynamically**:

```typescript
// In UnifiedAIService or agent code
const availableTools = await mcpService.listTools('filesystem');

// Include tools in AI context
const systemPrompt = `
Available tools:
${availableTools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

Use these tools to complete the user's request.
`;

// AI response may request tool execution
if (aiResponse.includes('use_tool:read_file')) {
  const result = await mcpService.callTool('filesystem', 'read_file', params);
  // Feed result back to AI
}
```

### Testing MCP Integration

**MCP tests require mocking** (`src/__tests__/services/MCPService.test.ts`):

```typescript
vi.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: vi.fn()
}));

vi.mock('child_process', () => ({
  spawn: vi.fn(() => mockProcess)
}));

// Force desktop mode for testing
const service = new MCPService(config, { forceDesktopMode: true });
```

---

## 💾 Database Integration

### Architecture

**Centralized SQLite database** at `D:\databases\database.db`:

- Shared across all VibeTech apps (monorepo pattern)
- **Electron**: Uses `better-sqlite3` (native performance)
- **Web**: Falls back to `sql.js` (in-memory) or localStorage

### Database Service Pattern

```typescript
import { DatabaseService } from '@/services/DatabaseService';

const db = new DatabaseService();

// Always initialize first
await db.initialize();

// Schema is auto-created via migrations
// See: src/services/migrationRunner.ts
```

### Data Models

**Chat History**:

```typescript
interface ChatMessage {
  id?: number;
  timestamp?: Date;
  workspace_path: string;
  user_message: string;
  ai_response: string;
  model_used: string;
  tokens_used?: number | null;
  workspace_context?: string | null; // JSON
}

// Usage
await db.saveChatMessage({
  workspace_path: '/path/to/project',
  user_message: 'How do I...?',
  ai_response: 'You can...',
  model_used: 'deepseek-chat',
  tokens_used: 1500
});

const history = await db.getChatHistory('/path/to/project', { limit: 50 });
```

**Code Snippets**:

```typescript
interface CodeSnippet {
  id?: number;
  language: string;
  code: string;
  description?: string | null;
  tags?: string | null; // JSON array
  created_at?: Date;
  usage_count?: number;
  last_used?: Date | null;
}

// Usage
await db.saveCodeSnippet({
  language: 'typescript',
  code: 'const example = () => {};',
  description: 'Example function',
  tags: JSON.stringify(['typescript', 'function'])
});

const snippets = await db.searchSnippets('typescript function');
```

**Analytics Events**:

```typescript
await db.logAnalyticsEvent('feature_used', {
  feature: 'ai_chat',
  duration: 5000,
  success: true
});

const stats = await db.getAnalytics('feature_used', { 
  startDate: new Date('2026-01-01'),
  endDate: new Date()
});
```

### Platform-Specific Behavior

```typescript
// In DatabaseService.ts
const getDatabasePath = (): string => {
  if (typeof window !== 'undefined' && window.electron?.isElectron) {
    // Electron: Use centralized DB
    return 'D:\\databases\\database.db';
  }
  // Web: Signal to use localStorage fallback
  return '';
};
```

**Fallback to localStorage** (automatic):

```typescript
// If database unavailable, service automatically uses localStorage
// Key prefix: 'deepcode_fallback_'
// Data serialized as JSON
```

### Migration System

**Auto-run on initialize**:

```typescript
// src/services/migrationRunner.ts
export async function runMigration(db: any): Promise<void> {
  // Creates tables if not exist
  // Runs schema updates
  // Adds indexes
}
```

**Adding new migration**:

```typescript
// Add to runMigration function
db.exec(`
  CREATE TABLE IF NOT EXISTS my_new_table (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);
```

---

## 🚀 Deployment & Distribution

### Build Process Overview

```powershell
# Full production build pipeline
npm run build              # 1. Build renderer + main process
npm run electron:build:win # 2. Package + create installers

# Or combined
npm run build:production && npm run electron:build:win
```

### Build Artifacts

**Output directory**: `dist-electron/`

**Windows artifacts** (from `electron-builder.yml`):

1. **NSIS Installer** - `Vibe Code Studio Setup 1.0.0.exe`
   - Full installer with shortcuts
   - Custom install directory
   - File associations (.js, .ts, .tsx, .jsx, .json)
   
2. **Portable** - `Vibe Code Studio-Portable-1.0.0-x64.exe`
   - No installation required
   - Settings stored in app directory
   
3. **ZIP Archive** - `vibe-code-studio-1.0.0-win.zip`
   - Manual extraction and run

### electron-builder Configuration

**Key settings** in `electron-builder.yml`:

```yaml
appId: com.vibetech.codestudio
productName: Vibe Code Studio

# ASAR archive (performance + security)
asar: true
asarUnpack:
  - "**/node_modules/better-sqlite3/**/*"  # Native module
  
# Windows targets
win:
  target:
    - nsis    # Installer
    - portable # Portable exe
    - zip     # Archive
  
# NSIS installer options
nsis:
  oneClick: false                         # User controls install
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  perMachine: false                       # User-level (no admin)
  fileAssociation:
    - ext: "js"
      name: "JavaScript File"
    - ext: "ts"
      name: "TypeScript File"
```

### Native Dependencies

**Handled automatically** via ASAR unpacking:

- `better-sqlite3` - Native SQLite bindings
- `node-pty` - Terminal emulation
- `sharp` - Image processing (if used)

**Rebuild native modules** if needed:

```powershell
npm run rebuild-deps
# Runs: electron-builder install-app-deps
```

### Code Signing (Optional)

**Not configured by default** - requires certificate:

```yaml
# Add to electron-builder.yml when ready
win:
  certificateFile: "path/to/certificate.pfx"
  certificatePassword: "${env.CERT_PASSWORD}"
  signingHashAlgorithms: ["sha256"]
```

**Without signing**: Windows shows "Unknown publisher" warning

- Users click "More info" → "Run anyway"

### Auto-Update Setup (Future)

**Already configured service** (`src/services/AutoUpdateService.ts`):

```typescript
// When ready to enable auto-updates
// 1. Set up release server (GitHub Releases, S3, etc.)
// 2. Update electron-builder.yml:
publish:
  provider: github
  owner: yourusername
  repo: vibe-code-studio

// 3. Service handles checking and downloading
import { autoUpdateService } from '@/services/AutoUpdateService';
await autoUpdateService.checkForUpdates();
```

### Distribution Checklist

**Pre-build quality checks**:

- [ ] Run `npm run lint` - ensure zero warnings
- [ ] Run `npm run typecheck` - verify strict TypeScript compliance
- [ ] Run `npm test` - all tests passing
- [ ] Run `npm run format:check` - code formatting verified

**Build and package**:

- [ ] Update version in `package.json`
- [ ] Run `npm run build:production`
- [ ] Run `npm run electron:build:win`

**Testing installers**:

- [ ] Test portable version (`*-Portable-*.exe`)
- [ ] Test NSIS installer (clean install)
- [ ] Verify file associations work (.ts, .js, .tsx, .jsx)
- [ ] Check app data persistence (settings, chat history)
- [ ] Test database integration (`D:\databases\database.db`)
- [ ] Test auto-update (if enabled)

**Distribution**:

- [ ] Archive installers with version number
- [ ] Document release notes
- [ ] Test on clean Windows machine (if possible)

### Multi-Platform Builds

**Cross-platform** (requires setup):

```powershell
# macOS (requires macOS machine)
npm run electron:build:mac

# Linux (can build from Windows with Docker)
npm run electron:build:linux

# All platforms
npm run package:all
```

### CI/CD Integration (Future)

**Note**: Git/GitHub not currently in use. CI/CD setup is for future integration.

**Planned GitHub Actions CI workflow**:

```yaml
# .github/workflows/build.yml (for future use)
- name: Build Electron App
  run: |
    npm ci
    npm run build:production
    npm run electron:build:win

- name: Publish artifacts
  run: |
    # store installer artifacts in your GitHub Actions artifact area or upload manually
    mkdir -p artifacts
    cp dist-electron/*.exe artifacts/
``` 

**Manual release process** (current):

1. Run quality checks: `npm run lint && npm run typecheck && npm test`
2. Build production: `npm run build:production`
3. Package: `npm run electron:build:win`
4. Test installers from `dist-electron/`
5. Distribute installers manually

---

## 🔧 Development Troubleshooting

### "better-sqlite3 binding not found"

**Solution**: Rebuild native modules for Electron version:

```powershell
npm run rebuild-deps
```

### MCP servers not starting

**Cause**: MCP only works in Electron, not web mode

**Solution**: Use `npm run dev` (not `npm run dev:web`)

### Monaco Editor not loading

**Cause**: Worker files not found

**Solution**: `@monaco-editor/react` handles workers automatically - no config needed

### Hot reload breaks after service changes

**Cause**: Service singletons keep old state

**Solution**: Restart dev server (`npm run dev`)

### Tests failing in CI

**Common issues**:

1. Missing environment variables
2. jsdom compatibility
3. MCP mocks not set up

**Solution**: Check `src/__tests__/setup.ts` and mock configurations
