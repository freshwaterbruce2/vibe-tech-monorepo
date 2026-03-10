# Nova Agent - Project Guide

**Project Path:** `C:\dev\apps\nova-agent`  
**Database:** `D:\databases\nova-data`, `D:\NovaData`  
**Logs:** `D:\logs\nova-agent`  
**Type:** AI Agent Framework (Tauri Desktop App)  
**Status:** Integration Testing Phase

---

## 🎯 Project Overview

Multi-model AI agent framework with local model support (DeepSeek), RAG capabilities, and desktop application interface. Built with Tauri (Rust), React, TypeScript, and Python.

### Key Features

- Local AI model support (DeepSeek-V3)
- Multi-model architecture
- RAG (Retrieval Augmented Generation)
- Desktop application (cross-platform)
- Agent orchestration
- Knowledge management
- Task automation
- Learning integration

---

## 📁 Project Structure

```
nova-agent/
├── src/                  # Frontend (React/TypeScript)
│   ├── components/      # UI components
│   ├── services/        # API services
│   ├── store/           # State management
│   └── utils/           # Utilities
├── src-tauri/           # Backend (Rust)
│   ├── src/
│   │   ├── main.rs     # Main entry
│   │   ├── commands.rs # Tauri commands
│   │   └── models/     # Data models
│   ├── Cargo.toml      # Rust dependencies
│   └── tauri.conf.json # Tauri config
├── databases/           # Local databases
├── prompts/             # Prompt templates
├── tools/               # Python tools
├── docs/                # Documentation
└── package.json
```

---

## 🚀 Quick Start

### First Time Setup

```powershell
# Navigate to project
cd C:\dev\apps\nova-agent

# Install Node dependencies
pnpm install

# Install Rust (if not installed)
# Download from https://rustup.rs/

# Verify Rust installation
rustc --version
cargo --version

# Setup Python environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# Copy environment template
Copy-Item .env.example .env
code .env
```

### Required Environment Variables

```bash
# .env file
DATABASE_PATH=D:\databases\nova-data\nova_activity.db
NOVA_DATA_PATH=D:\NovaData
LOG_PATH=D:\logs\nova-agent
DEEPSEEK_MODEL_PATH=C:\dev\DeepSeek-V3.2-Exp
HUGGINGFACE_TOKEN=your_token_here  # Optional
```

### Development Mode

```powershell
# Start development server
pnpm dev

# Or with Tauri CLI
cargo tauri dev

# Frontend only (React)
pnpm dev:frontend

# Backend only (Rust)
cd src-tauri
cargo run
```

### Building

```powershell
# Build for production
pnpm build

# Or with Tauri CLI
cargo tauri build

# Output: src-tauri/target/release/nova-agent.exe
```

---

## 🤖 Local Model Setup (DeepSeek)

### Model Location

**Path:** `C:\dev\DeepSeek-V3.2-Exp`

### Model Files

```
DeepSeek-V3.2-Exp/
├── config.json
├── generation_config.json
├── model.safetensors.index.json
├── tokenizer.json
├── tokenizer_config.json
└── model files...
```

### Loading Model

```python
# tools/load_model.py
from transformers import AutoModelForCausalLM, AutoTokenizer

model_path = "C:/dev/DeepSeek-V3.2-Exp"

# Load tokenizer
tokenizer = AutoTokenizer.from_pretrained(model_path)

# Load model
model = AutoModelForCausalLM.from_pretrained(
    model_path,
    device_map="auto",
    torch_dtype="auto"
)

# Generate
inputs = tokenizer("Your prompt", return_tensors="pt")
outputs = model.generate(**inputs, max_length=500)
response = tokenizer.decode(outputs[0])
```

### Testing Model

```powershell
# Test model loading
python test_deepseek.py

# Test with AutoModel
python test_deepseek_automodel.py

# Check model configuration
python check_model_config.py

# List model files
python check_model_files.py
```

---

## 📊 Database Schema

### Primary Database

**Location:** `D:\databases\nova-data\nova_activity.db`

```sql
-- Agent activities
CREATE TABLE agent_activities (
    id INTEGER PRIMARY KEY,
    timestamp DATETIME,
    agent_id TEXT,
    activity_type TEXT,
    description TEXT,
    status TEXT
);

-- Tasks
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY,
    created_at DATETIME,
    task_type TEXT,
    description TEXT,
    status TEXT,
    assigned_agent TEXT
);

-- Knowledge base
CREATE TABLE knowledge (
    id INTEGER PRIMARY KEY,
    content TEXT,
    embedding BLOB,
    metadata TEXT,
    created_at DATETIME
);
```

### Nova Data Directory

**Location:** `D:\NovaData`

```
NovaData/
├── nova_memory.db      # Agent memory
├── embeddings/         # Vector embeddings
├── cache/             # Response cache
└── checkpoints/       # Model checkpoints
```

---

## 🛠️ Development Workflow

### Frontend Development

```powershell
# Start dev server
pnpm dev:frontend

# Type check
pnpm typecheck

# Lint
pnpm lint

# Format
pnpm format
```

### Backend Development (Rust)

```powershell
cd src-tauri

# Build
cargo build

# Run tests
cargo test

# Check
cargo check

# Format
cargo fmt

# Lint
cargo clippy
```

### Python Tools

```powershell
# Activate venv
.\.venv\Scripts\Activate.ps1

# Run agent script
python tools\agent_runner.py

# Test RAG
python tools\test_rag.py

# Manage knowledge
python tools\knowledge_manager.py
```

---

## 🧪 Testing

### Frontend Tests

```powershell
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Coverage
pnpm test:coverage
```

### Backend Tests (Rust)

```powershell
cd src-tauri

# All tests
cargo test

# Specific test
cargo test test_agent_command

# With output
cargo test -- --nocapture
```

### Integration Tests

```powershell
# Full integration test
pnpm test:integration

# Test reports
# See: INTEGRATION_TEST_REPORT.md
```

---

## 🎯 RAG Implementation

### Setup ChromaDB

```python
# tools/setup_rag.py
import chromadb

client = chromadb.PersistentClient(path="D:/NovaData/chroma_db")
collection = client.get_or_create_collection(name="nova_knowledge")

# Add documents
collection.add(
    documents=["Knowledge text"],
    metadatas=[{"source": "file.txt"}],
    ids=["doc_1"]
)

# Query
results = collection.query(
    query_texts=["query"],
    n_results=3
)
```

### Using RAG

```python
# tools/rag_query.py
def query_knowledge(question):
    # Retrieve relevant context
    results = collection.query(query_texts=[question], n_results=5)
    context = '\n'.join(results['documents'][0])
    
    # Generate with context
    prompt = f"Context: {context}\n\nQuestion: {question}\n\nAnswer:"
    response = model.generate(prompt)
    
    return response
```

---

## 🔧 Configuration

### Tauri Config

**File:** `src-tauri/tauri.conf.json`

```json
{
  "build": {
    "beforeDevCommand": "pnpm dev:frontend",
    "beforeBuildCommand": "pnpm build:frontend",
    "devPath": "http://localhost:5173",
    "distDir": "../dist"
  },
  "tauri": {
    "bundle": {
      "identifier": "com.vibe.nova-agent",
      "icon": ["icons/icon.png"]
    },
    "windows": [{
      "title": "Nova Agent",
      "width": 1200,
      "height": 800
    }]
  }
}
```

### Rust Dependencies

**File:** `src-tauri/Cargo.toml`

```toml
[dependencies]
tauri = "1.5"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1", features = ["full"] }
sqlx = { version = "0.7", features = ["sqlite", "runtime-tokio-native-tls"] }
```

---

## 🐛 Troubleshooting

### Rust Build Fails

```powershell
# Clean build
cd src-tauri
cargo clean
cargo build

# Update dependencies
cargo update

# Check Rust version
rustc --version  # Should be recent stable
```

### Model Loading Issues

```powershell
# Verify model path
Test-Path C:\dev\DeepSeek-V3.2-Exp

# Check model files
python check_model_files.py

# Test with minimal config
python test_model_minimal.py

# Check GPU/CUDA
nvidia-smi  # If using GPU
```

### Database Issues

```powershell
# Check database
python -c "import sqlite3; conn = sqlite3.connect('D:/databases/nova-data/nova_activity.db'); print('OK')"

# Reset database
python tools\reset_database.py

# Backup first!
Copy-Item D:\databases\nova-data\*.db D:\backups\nova-agent\
```

### Tauri DevTools Issues

```powershell
# Clear cache
Remove-Item -Recurse src-tauri\target\debug

# Reinstall Tauri CLI
cargo install tauri-cli

# Update WebView2
# Download from Microsoft Edge WebView2 Runtime
```

---

## 📚 Important Documentation

### Project Docs

- `README.md` - Overview
- `NOVA_AGENT_TRUE_CAPABILITIES.md` - Capabilities
- `INTEGRATION_TEST_REPORT.md` - Test results
- `PRODUCTION_READINESS_REPORT.md` - Production status
- `RAG_IMPLEMENTATION_PLAN.md` - RAG design
- `RUNBOOK.md` - Operations guide

### Session Summaries

- `SESSION_SUMMARY_2025-12-02.md`
- `SESSION_SUMMARY_2025-12-10.md`
- `FINAL_STATUS.md`
- `PHASE_STATUS.md`

### Setup Guides

- `STARTUP_GUIDE.md` - Getting started
- `RUST_SETUP.md` - Rust environment
- `RAG_TESTING_GUIDE.md` - RAG testing

---

## 🎯 Key Features

### Agent Orchestration

- Multi-agent coordination
- Task distribution
- Priority management
- Result aggregation

### Knowledge Management

- RAG-powered retrieval
- Vector embeddings
- Semantic search
- Knowledge graph

### Local Models

- DeepSeek-V3 integration
- HuggingFace models
- Custom model support
- Model switching

### Desktop Interface

- Cross-platform (Tauri)
- Native performance
- System tray integration
- Native notifications

---

## 🔄 Maintenance

### Daily

```powershell
# Check agent status
python tools\check_status.py

# View logs
Get-Content D:\logs\nova-agent\app.log -Tail 50
```

### Weekly

```powershell
# Update dependencies
pnpm update
cargo update

# Run tests
pnpm test
cargo test

# Backup databases
Copy-Item D:\databases\nova-data\*.db D:\backups\nova-agent\
```

### Monthly

```powershell
# Clean build artifacts
cargo clean
pnpm clean

# Update models
python tools\update_models.py

# Performance analysis
python tools\analyze_performance.py
```

---

**Last Updated:** January 2, 2026  
**Version:** Beta  
**Status:** Integration Testing

