# ⚡ Vibe Code Studio

**The AI-Powered Code Editor of the Future**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-GitHub-2185D0.svg)](https://github.com/freshwaterbruce2/Monorepo)

A modern, intelligent code editor powered by DeepSeek AI - built as a compelling alternative to Cursor with cost-effective AI integration and lightning-fast performance.

![Vibe Code Studio Screenshot](https://via.placeholder.com/800x400/1e1e1e/00d2ff?text=Vibe+Code+Studio)

> Local-first workflow: this project is maintained and validated locally, with GitHub-preferred remote hosting workflows.

## 🚀 Features

### 🤖 **AI-First Development**

- **DeepSeek AI Integration**: 10x more cost-effective than GPT-4/Claude
- **DeepSeek Reasoner (NEW!)**: Chain of Thought reasoning model for complex problem solving
- **Real-time Code Completion**: Smart suggestions as you type
- **AI Chat Assistant**: Get help with code explanation, generation, and debugging
- **Context-Aware Suggestions**: AI understands your entire codebase
- **Live Editor Streaming**: Watch code changes appear in real-time (Cursor/Windsurf-style)
- **Advanced Agent Mode**: 7-phase autonomous coding system with self-correction and learning

### 💻 **Modern Editor Experience**

- **Monaco Editor**: Same engine that powers VS Code
- **Multi-language Support**: JavaScript, TypeScript, Python, Java, C++, and more
- **Intelligent Syntax Highlighting**: Beautiful, accurate code coloring
- **Advanced Code Navigation**: Go to definition, find references, symbol search

### 🔧 **Developer Productivity**

- **File Management**: Built-in file explorer with project navigation
- **Hot Key Support**: All your favorite keyboard shortcuts
- **Auto-save**: Never lose your work again
- **Split Panes**: Work on multiple files simultaneously

### 🎨 **Beautiful Interface**

- **Dark Theme**: Easy on the eyes for long coding sessions
- **Customizable Layout**: Sidebar, chat panel, and editor arrangement
- **Responsive Design**: Works perfectly on any screen size
- **Professional Styling**: Clean, modern VS Code-inspired design

## 🎯 Why Vibe Code Studio?

### **vs Cursor**

- ✅ **10x Cheaper AI**: DeepSeek vs OpenAI pricing
- ✅ **Faster Responses**: Lower latency AI interactions
- ✅ **Open Architecture**: Customize and extend as needed
- ✅ **No Vendor Lock-in**: Your code, your choice

### **vs VS Code**

- ✅ **AI-Native**: Built from ground up for AI assistance
- ✅ **Integrated Chat**: No need for separate AI extensions
- ✅ **Optimized Performance**: Streamlined for coding tasks
- ✅ **Modern Stack**: React + TypeScript + Monaco

## 🛠️ Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Git (for version control features)

### Installation

```bash
# Clone the repository
git clone https://github.com/freshwaterbruce2/vibe-code-studio.git
cd vibe-code-studio

# Install dependencies
npm install

# Set up Git hooks (for pre-commit checks)
npm run prepare

# Start development server
npm run dev:web
```

### Get Your DeepSeek API Key

1. Visit [platform.deepseek.com](https://platform.deepseek.com/)
2. Sign up and create an API key
3. Add to your `.env` file:

```env
VITE_DEEPSEEK_API_KEY=your_api_key_here
VITE_DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
VITE_DEEPSEEK_MODEL=deepseek-chat  # or deepseek-coder, deepseek-reasoner
```

## 🎮 Usage

### Getting Started

1. **Open the editor** at `http://localhost:3001`
2. **Create a new file** or open an existing project
3. **Start coding** with AI assistance
4. **Ask the AI** anything via the chat panel

### AI Features

- **Code Completion**: Press `Ctrl+Space` for AI suggestions
- **Ask AI**: Click the chat icon or press `Ctrl+Shift+A`
- **Quick Actions**: "Explain code", "Generate function", "Fix bugs"

### AI Models

Vibe Code Studio supports multiple DeepSeek models:

1. **DeepSeek Chat** (Default)
   - General purpose coding assistant
   - Fast responses with good accuracy
   - Best for everyday coding tasks

2. **DeepSeek Coder**
   - Specialized for code generation
   - Better understanding of programming patterns
   - Ideal for complex coding challenges

3. **DeepSeek Reasoner** (NEW!)
   - Chain of Thought (CoT) reasoning model
   - Shows detailed reasoning process
   - Maximum 64K context, 32K output
   - Best for complex problem solving and debugging

To select a model, go to Settings (Ctrl+,) → AI Features → AI Model

### Keyboard Shortcuts

- `Ctrl+S` - Save file
- `Ctrl+/` - Toggle comment
- `Ctrl+D` - Duplicate line
- `Alt+↑/↓` - Move line up/down
- `Ctrl+Space` - Trigger AI completion
- `Ctrl+Shift+A` - Open AI chat

## 📊 Performance & Pricing

### DeepSeek AI Costs

- **Input**: ~$0.14 per 1M tokens
- **Output**: ~$0.28 per 1M tokens
- **vs GPT-4**: ~20x cheaper
- **vs Claude**: ~10x cheaper

### Speed Benchmarks

- **Code Completion**: <200ms average
- **AI Chat Response**: <2s average
- **File Operations**: Instant
- **Startup Time**: <3s

## 🏗️ Architecture

### 💾 Database Storage

**CRITICAL**: This application stores all persistent data in a centralized SQLite database.
- **Location**: `D:\databases\database.db`
- **Why**: To ensure data persistence across updates, prevent file locking issues on `C:\`, and separate user data from application code.
- **Backup**: The `D:\databases\` directory is automatically backed up by the Vibe Learning System.



Vibe Code Studio follows a modular architecture with clear separation of concerns:

```
src/
├── modules/             # Feature modules with isolated functionality
│   ├── editor/         # Editor module
│   │   ├── components/ # Module-specific components
│   │   ├── services/   # Module-specific services
│   │   ├── hooks/      # Module-specific hooks
│   │   └── types/      # Module-specific types
│   └── ModuleRegistry.ts # Central module management
├── components/          # Shared React UI components
│   ├── Editor.tsx      # Monaco editor wrapper
│   ├── AIChat.tsx      # AI chat interface
│   ├── Sidebar.tsx     # File explorer
│   └── ...
├── services/           # Core services and business logic
│   ├── ai/             # AI-related services
│   │   ├── AIClient.ts
│   │   ├── MultiAgentReview.ts
│   │   └── StreamingAIService.ts
│   ├── specialized-agents/ # Specialized AI agents
│   ├── DeepSeekService.ts
│   ├── FileSystemService.ts
│   └── ...
├── hooks/              # Development automation scripts
├── types/              # TypeScript definitions
└── App.tsx            # Main application orchestrator
```

### Key Architectural Principles

- **Modular Design**: Features are organized into self-contained modules
- **Service Layer**: Business logic separated from UI components
- **Type Safety**: Comprehensive TypeScript usage throughout
- **Performance First**: Virtual rendering and lazy loading for large codebases
- **AI Integration**: Multi-agent system for intelligent code assistance

For detailed architecture documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md)

## 🛣️ Roadmap

### Phase 1: Core Features ✅

- [x] Monaco Editor integration
- [x] DeepSeek AI completion
- [x] File management
- [x] AI chat interface
- [x] Beautiful UI/UX
- [x] Agent Mode 2025 Enhancement (7 phases complete)
- [x] Live Editor Streaming
- [x] Multi-agent orchestration system

### Phase 2: Advanced Features 🚧

- [x] Git integration
- [x] Tab completion / inline suggestions
- [x] Auto-fix error detection
- [x] Multi-file editing with diff preview
- [x] Background task execution
- [x] Plugin system
- [x] Collaborative editing
- [x] Advanced debugging
- [x] Theme customization

### Phase 3: Distribution 📦

- [x] Electron desktop app
- [x] VS Code extension
- [x] Web deployment
- [x] Docker containers

**See**: [FEATURE_ROADMAP_2025.md](./FEATURE_ROADMAP_2025.md) and [AGENT_MODE_2025_ROADMAP.md](./AGENT_MODE_2025_ROADMAP.md) for detailed implementation plans.

## 💰 Business Model

### Target Market

- **Individual Developers**: $10-20/month
- **Small Teams**: $50-100/month
- **Enterprise**: $200-500/month

### Revenue Projections

- **Month 1-3**: 100 users = $1K-2K MRR
- **Month 3-6**: 1K users = $10K-20K MRR
- **Month 6-12**: 5K users = $50K-100K MRR

### Competitive Advantages

- **Cost-effective AI**: Higher margins than competitors
- **Fast development**: Quick feature iteration
- **Modern architecture**: Easy to maintain and extend

## 🧪 Testing

Vibe Code Studio maintains high code quality through comprehensive testing:

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run hook:test-watch

# Run specific test file
npx vitest run src/__tests__/services/DeepSeekService.test.ts

# Run tests with coverage
npx vitest --coverage
```

### Testing Guidelines

- **Unit Tests**: All services and utilities must have tests
- **Component Tests**: UI components tested with React Testing Library
- **Integration Tests**: Critical workflows have end-to-end coverage
- **Performance Tests**: Memory and performance monitoring hooks

## 🔧 Development Workflow

### Pre-commit Hooks

The project uses Husky and lint-staged for automated code quality checks:

- **TypeScript Type Checking**: Ensures type safety
- **ESLint**: Enforces code style and catches common errors
- **Prettier**: Formats code consistently
- **Import Sorting**: Keeps imports organized

### Development Commands

```bash
# Start full development environment (web + electron)
npm run dev

# Start web-only development
npm run dev:web

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Type checking
npm run typecheck

# Watch mode for tests
npm run hook:test-watch

# Watch mode for formatting
npm run hook:format-watch

# Performance monitoring
npm run hook:performance

# Memory monitoring
npm run hook:memory-watch
```

### Development Hooks

The project includes several automation hooks in the `/hooks` directory:

- **test-watch.js**: Auto-runs tests on file changes
- **format-on-save.js**: Auto-formats code on save
- **pre-commit.js**: Runs quality checks before commits
- **performance-monitor.js**: Tracks performance metrics
- **memory-monitor.js**: Monitors memory usage
- **generate-docs.js**: Auto-generates documentation

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Fork and clone the repo
git clone https://github.com/freshwaterbruce2/vibe-code-studio.git

# Install dependencies
npm install

# Set up Git hooks
npm run prepare

# Start development
npm run dev:web

# Run tests
npm test

# Build for production
npm run build
```

### Contribution Guidelines

1. **Branch Naming**: Use `feature/`, `fix/`, or `docs/` prefixes
2. **Commit Messages**: Follow conventional commits format
3. **Tests**: Add tests for new features
4. **Documentation**: Update docs for API changes
5. **Code Review**: All merge requests should be reviewed before merging

## 📜 License

MIT License - see [LICENSE](LICENSE) for details.

## 🔗 Links

- **Live Demo**: [deepcode-editor.dev](https://deepcode-editor.dev)
- **Documentation**: [docs.deepcode-editor.dev](https://docs.deepcode-editor.dev)
- **Discord**: [Join our community](https://discord.gg/vibecodestudio)
- **Twitter**: [@VibeCodeStudio](https://twitter.com/VibeCodeStudio)

## 🌟 Show Your Support

If you like Vibe Code Studio, please ⭐ star this repository and share it with other developers!

---

**Built with ❤️ by developers, for developers**

_Experience the future of coding with AI-powered assistance that understands your intent and helps you build faster than ever before._
