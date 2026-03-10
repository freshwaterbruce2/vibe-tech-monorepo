---
name: learning-system-skill
description: AI learning and memory systems - pattern recognition, context persistence, training data
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
category: infrastructure
---

# Learning System Development Skill

> **For ALL learning/memory systems**: Context management, pattern learning, training

## System Components

| Component | Location | Purpose |
|-----------|----------|---------|
| Memory Bank | `apps/memory-bank` | Session context, quick-access |
| Learning DB | `D:\databases\learning_system.db` | Pattern storage |
| Training Data | `D:\learning-system\` | Training results |
| Agent Orchestrator | `apps/memory-bank/agent_orchestrator.py` | Agent selection |

## Architecture

```
Learning System
├── Memory Bank (Node.js)
│   ├── memory_manager.js     # Core memory operations
│   ├── memory_cli.js         # CLI interface
│   └── quick-access/         # Fast-access cache
├── Learning Database (SQLite)
│   ├── patterns              # Learned patterns
│   ├── agent_performance     # Agent metrics
│   └── training_results      # Training outcomes
├── Training Pipeline (Python)
│   ├── train_from_patterns.py
│   └── pattern_analyzer.py
└── Integration Points
    ├── Hooks (session-start, prompt-submit)
    └── Skill Mapping (skill-mapping.json)
```

## Key Patterns

### Memory Storage
```javascript
// apps/memory-bank/memory_manager.js
class MemoryManager {
  async storeData(key, data, metadata = {}) {
    const entry = {
      key,
      data,
      metadata,
      timestamp: new Date().toISOString(),
      type: metadata.type || 'general'
    };
    // Store in SQLite + quick-access cache
  }

  async retrieveData(key, type = null) {
    // Check cache first, then database
  }
}
```

### Pattern Learning
```python
# Pattern structure
pattern = {
    "id": "uuid",
    "trigger": "regex or keyword pattern",
    "context": "when this pattern applies",
    "action": "what to do when matched",
    "confidence": 0.85,
    "times_used": 42,
    "success_rate": 0.92
}
```

### Agent Performance Tracking
```python
# Track agent selection and outcomes
def track_agent_performance(agent_name, task_type, success, duration):
    db.execute("""
        INSERT INTO agent_performance
        (agent, task_type, success, duration, timestamp)
        VALUES (?, ?, ?, ?, ?)
    """, [agent_name, task_type, success, duration, now()])
```

### Context Retrieval
```javascript
// Retrieve relevant context for current task
async function getRelevantContext(prompt, project) {
  // 1. Get recent session context
  const session = await memory.retrieveData('last-session');

  // 2. Get project-specific patterns
  const patterns = await db.query(`
    SELECT * FROM patterns
    WHERE project = ? OR project = 'global'
    ORDER BY confidence DESC, times_used DESC
    LIMIT 10
  `, [project]);

  // 3. Get agent recommendations
  const agents = await orchestrator.recommend(prompt, project);

  return { session, patterns, agents };
}
```

## Training Pipeline

### Pattern Extraction
```python
# Extract patterns from successful interactions
def extract_patterns(conversation):
    patterns = []
    for exchange in conversation:
        if exchange['outcome'] == 'success':
            pattern = {
                'trigger': extract_trigger(exchange['prompt']),
                'action': extract_action(exchange['response']),
                'context': extract_context(exchange)
            }
            patterns.append(pattern)
    return patterns
```

### Training Workflow
```bash
# 1. Collect training data
python collect_training_data.py --days 7

# 2. Analyze patterns
python pattern_analyzer.py --input training_data.json

# 3. Train/update models
python train_from_patterns.py --patterns patterns.json

# 4. Validate results
python validate_training.py --test-set test_data.json
```

## Database Schema

```sql
-- Learning system schema
CREATE TABLE patterns (
    id TEXT PRIMARY KEY,
    trigger TEXT NOT NULL,
    context TEXT,
    action TEXT NOT NULL,
    project TEXT DEFAULT 'global',
    confidence REAL DEFAULT 0.5,
    times_used INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE agent_performance (
    id INTEGER PRIMARY KEY,
    agent TEXT NOT NULL,
    task_type TEXT,
    success INTEGER,
    duration_ms INTEGER,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE training_results (
    id INTEGER PRIMARY KEY,
    run_id TEXT NOT NULL,
    patterns_learned INTEGER,
    accuracy REAL,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_patterns_project ON patterns(project);
CREATE INDEX idx_patterns_confidence ON patterns(confidence DESC);
CREATE INDEX idx_agent_perf_agent ON agent_performance(agent);
```

## Integration with Hooks

### Session Start Hook
```powershell
# Load context at session start
$context = Get-RelevantContext -Project $project
Show-ContextSummary -Context $context
```

### Prompt Submit Hook
```powershell
# Analyze prompt, recommend skills
$analysis = Analyze-Prompt -Prompt $userPrompt
$skills = Get-RecommendedSkills -Analysis $analysis -Project $project
Show-SkillRecommendations -Skills $skills
```

## Quality Checklist

- [ ] Patterns have confidence > 0.7
- [ ] Agent recommendations are accurate
- [ ] Context retrieval is fast (<50ms)
- [ ] Training data is clean
- [ ] No PII in learned patterns
- [ ] Backup before training runs

## Common Operations

```bash
# Check learning system status
python -c "from learning_db import get_stats; print(get_stats())"

# Export patterns
sqlite3 D:/databases/learning_system.db ".mode json" "SELECT * FROM patterns" > patterns.json

# Reset low-confidence patterns
sqlite3 D:/databases/learning_system.db "DELETE FROM patterns WHERE confidence < 0.3"
```

## Community Skills to Use

- `database-skill` - SQLite operations
- `python-patterns` - Python code
- `systematic-debugging` - Issue investigation
