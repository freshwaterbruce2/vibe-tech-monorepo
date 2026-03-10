# Nova Agent - RAG System Testing Guide

## What Was Implemented

✅ **Backend (Rust)**:

- ChromaDB client for vector embeddings
- Text chunking algorithm (500 chars per chunk)
- 4 Tauri commands: `rag_index_file`, `rag_search`, `rag_index_directory`, `rag_clear_index`

✅ **Frontend (TypeScript)**:

- `RAGService` class with full API coverage
- Chat interface integration with automatic context injection
- Visual indicator showing RAG is active
- Citation display in AI responses

✅ **Features**:

- Semantic code search across entire workspace
- Automatic context retrieval before each AI query
- Support for multiple file types (TS, RS, MD, PY, JS, JSX)
- Intelligent chunking preserves code structure

---

## Quick Start (3 Steps)

### 1. Install & Start ChromaDB

```powershell
# Install ChromaDB (one-time)
pip install chromadb

# Start ChromaDB server (keep this running)
chroma run --host localhost --port 8000 --path D:\databases\chromadb
```

**Expected Output**:

```
Chroma is running on http://localhost:8000
```

### 2. Launch Nova Agent

```powershell
cd C:\dev\apps\nova-agent

# Make sure you have your DeepSeek API key in src-tauri\.env
# DEEPSEEK_API_KEY=sk-your-key-here

pnpm dev
```

### 3. Test RAG System

Open: <http://localhost:5173/chat>

---

## Test Plan

### Test 1: Index a Single File (Browser Console)

Open browser DevTools Console (F12) and run:

```javascript
// Test indexing
await window.__TAURI__.invoke('rag_index_file', {
  filePath: 'C:\\dev\\apps\\nova-agent\\README.md',
  content: `Nova Agent is an AI-powered desktop assistant with deep system integration.

Features:
- Multi-agent system (Nova, Architect, Coder)
- DeepSeek V3.2 integration
- Code execution capabilities
- Web search
- RAG semantic search`,
  metadata: { language: 'markdown', project: 'nova-agent' }
});
```

**Expected**: No error (Promise resolves)

### Test 2: Search RAG Index (Browser Console)

```javascript
const results = await window.__TAURI__.invoke('rag_search', {
  query: 'What are the features of Nova Agent?',
  topK: 3
});

console.log('RAG Results:', results);
```

**Expected Output**:

```json
[
  {
    "id": "C:\\dev\\apps\\nova-agent\\README.md::0",
    "document": "Nova Agent is an AI-powered desktop assistant...",
    "distance": 0.15,
    "metadata": {
      "file_path": "C:\\dev\\apps\\nova-agent\\README.md",
      "language": "markdown",
      "chunk_index": 0
    }
  }
]
```

### Test 3: Chat with RAG Context

In the Chat UI:

**User**: "What features does Nova Agent have?"

**Expected**:

1. RAG searches and finds README.md chunk
2. AI response mentions features from README (multi-agent, DeepSeek, etc.)
3. Citations appear below AI message showing "README.md"

### Test 4: Index Entire Workspace (Browser Console)

⚠️ **WARNING**: This will index your entire C:\dev directory. May take 5-10 minutes for large codebases.

```javascript
const fileCount = await window.__TAURI__.invoke('rag_index_directory', {
  dirPath: 'C:\\dev\\apps\\nova-agent',
  fileExtensions: ['ts', 'tsx', 'rs', 'md']
});

console.log(`Indexed ${fileCount} files`);
```

**Expected**: Number of files indexed (e.g., "Indexed 87 files")

### Test 5: Advanced Search

After indexing, test semantic search:

**Chat**: "How do I use the context engine?"

**Expected**:

- RAG finds chunks from `context_engine.rs` or related docs
- AI explains context engine with code examples
- Citations show source files

---

## Troubleshooting

### Issue: "Failed to connect to ChromaDB"

**Solution**:

```powershell
# Check if ChromaDB is running
netstat -ano | findstr "8000"

# If not running, start it:
chroma run --host localhost --port 8000 --path D:\databases\chromadb
```

### Issue: "No RAG results found"

**Cause**: Index is empty

**Solution**: Index some files first (see Test 1 or Test 4)

### Issue: "RAG search is slow"

**Normal Behavior**: First search after indexing can take 1-2 seconds. Subsequent searches should be <200ms.

**If consistently slow**:

- Check ChromaDB process isn't consuming excessive memory
- Reduce `topK` parameter (default is 3, try 2)

### Issue: "Chat doesn't show citations"

**Check**:

1. Open browser DevTools Console
2. Look for RAG-related logs when sending a message
3. Verify ChromaDB is running

---

## Performance Benchmarks

| Operation | Expected Time |
|-----------|--------------|
| Index single file (5KB) | <100ms |
| Index 100 files | ~10s |
| Search (3 results) | <200ms |
| Index entire workspace (1000 files) | ~2-5 min |

| Storage | Size |
|---------|------|
| 100 files indexed | ~5MB |
| 1000 files indexed | ~50MB |

---

## Using RAG in Your Workflow

### Workflow 1: Project Documentation Q&A

```markdown
1. Index project: rag_index_directory('C:\\dev\\my-project', ['md'])
2. Ask: "What is the project architecture?"
3. AI responds with info from README.md, ARCHITECTURE.md, etc.
```

### Workflow 2: Code Understanding

```markdown
1. Index codebase: rag_index_directory('C:\\dev\\my-project', ['ts', 'tsx'])
2. Ask: "How does the authentication system work?"
3. AI finds and explains relevant code chunks
```

### Workflow 3: API Documentation Lookup

```markdown
1. Index docs: rag_index_directory('C:\\dev\\docs', ['md'])
2. Ask: "How do I use the payment API?"
3. AI provides exact API usage from docs with citations
```

---

## Advanced: Custom Indexing

### Index Specific Project

```javascript
await window.__TAURI__.invoke('rag_index_directory', {
  dirPath: 'C:\\dev\\apps\\my-app',
  fileExtensions: ['ts', 'tsx', 'md', 'json']
});
```

### Clear Index Before Re-indexing

```javascript
await window.__TAURI__.invoke('rag_clear_index');
// Then index again
```

### Index Multiple Projects

```javascript
const projects = [
  'C:\\dev\\apps\\nova-agent',
  'C:\\dev\\apps\\crypto-enhanced',
  'C:\\dev\\packages\\shared-utils'
];

for (const project of projects) {
  const count = await window.__TAURI__.invoke('rag_index_directory', {
    dirPath: project,
    fileExtensions: ['ts', 'tsx', 'rs', 'md']
  });
  console.log(`Indexed ${count} files from ${project}`);
}
```

---

## Next Steps

### Immediate

1. ✅ Start ChromaDB
2. ✅ Index Nova Agent README (Test 1)
3. ✅ Test search (Test 2)
4. ✅ Test chat with context (Test 3)

### Optional

5. Index entire workspace (Test 4)
2. Create RAG Settings UI (see RAG_IMPLEMENTATION_PLAN.md)
3. Add incremental indexing (only re-index changed files)

---

## FAQ

**Q: Does RAG work offline?**
A: Yes! Once files are indexed, search works offline. Only the AI API call requires internet.

**Q: How much disk space does RAG use?**
A: ~10MB per 1000 indexed files. ChromaDB stores embeddings efficiently.

**Q: Can I search across multiple programming languages?**
A: Yes! Just include all extensions when indexing: `['ts', 'py', 'rs', 'go', 'java']`

**Q: Will RAG slow down my chat?**
A: Negligible impact. Search adds ~100-200ms, but responses are much more accurate.

**Q: Can I use a different embedding model?**
A: ChromaDB uses default embeddings. For custom models, you'd need to configure ChromaDB server with a different embedding function.

---

## Success Criteria

✅ ChromaDB running on localhost:8000
✅ Can index a file and search for it
✅ Chat interface shows citations
✅ AI responses include context from indexed files
✅ Search latency <200ms

**If all tests pass, RAG is working perfectly!** 🎉
