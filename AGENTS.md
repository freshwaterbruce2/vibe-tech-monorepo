<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

<!-- nx configuration end-->

## Local + GitHub Workflow Rule

- Treat the local working tree as the primary source of truth.
- Prefer local workflows and local validation commands first.
- Prefer GitHub workflows/remotes when repository hosting is relevant.

# AGENTS.md - Learning System Integration

**Add this section to all project AGENTS.md files**

## Data-Driven Development Guidelines

The learning system has analyzed **57,126 agent executions** and identified proven patterns for success. Follow these evidence-based guidelines:

### 🎯 Tool Selection Rules (Evidence-Based)

#### ✅ HIGH-SUCCESS PATTERNS (Use These)

Based on 100% success rates with thousands of executions:

**For File Operations**:

- ✓ `Read + Edit + Bash` - 100% success in 4 uses
- ✗ AVOID `Read + Write + Edit` - Only 14% success in 7 uses

**Rationale**: Edit is more reliable than Write for existing files. Write creates conflicts.

**For Monitoring/Analysis**:

- ✓ `["system_monitor", "error_detector"]` - 20,702 successful uses
- ✓ `["pattern_analyzer", "insight_generator"]` - 1,032 successful uses

**For Data Processing**:

- ✓ `["market_data_parser", "data_storage", "anomaly_detector"]` - 14,700 successful uses
- ✓ `["data_analyzer", "statistical_analyzer", "model_updater"]` - 542 successful uses

### ⚠️ Common Failure Prevention

Based on analysis of 36 documented mistakes:

#### Error Type: connection_fix_failure (15 occurrences)

**Prevention**:

```python
# ALWAYS validate before fixing
if not connection.is_healthy():
    connection.reset()
    if not connection.verify():
        raise ConnectionError("Cannot establish healthy connection")

# Then proceed with fix
apply_fix()
```

#### Error Type: validation_failure (7 occurrences)

**Prevention**:

```python
# ALWAYS validate inputs
def process_data(data):
    if not validate_schema(data):
        raise ValidationError("Schema mismatch")

    if not sanitize_input(data):
        raise ValidationError("Invalid data format")

    # Then proceed
    return transform(data)
```

### 🚀 Performance Patterns (Data-Proven)

#### Auto-Fix Cycle Pattern

**Evidence**: 29,420 successful executions, 0.18s average
**When to use**: Automated workflows, error recovery
**Implementation**:

```python
while system.running:
    errors = monitor.detect_errors()
    if errors:
        for error in errors:
            fix = auto_fixer.generate_fix(error)
            fix.apply()
            verify.check_resolution(error)
```

#### Fast Data Processing Pattern

**Evidence**: 14,700 executions at 0.08s average
**When to use**: Real-time data processing
**Implementation**:

```python
def fast_process(data_stream):
    parsed = parser.parse(data_stream)  # Fast parsing
    storage.batch_insert(parsed)         # Batch operations
    anomalies = detector.scan(parsed)    # Parallel detection
    return anomalies
```

### ⏱️ Performance Targets

Based on successful execution times:

| Task Type      | Target Time | Current Best | Optimization Needed   |
| -------------- | ----------- | ------------ | --------------------- |
| Auto-fix cycle | < 0.2s      | 0.18s        | ✓ Achieved            |
| Data analysis  | < 0.1s      | 0.08s        | ✓ Achieved            |
| Monitoring     | < 0.2s      | 0.15s        | ✓ Achieved            |
| API testing    | < 15s       | 28.5s        | ⚠️ Needs optimization |
| Test coverage  | < 60s       | 120.3s       | ⚠️ Needs optimization |

**If task exceeds target**:

1. Implement parallel processing
2. Add caching layer
3. Use async/await patterns
4. Consider batch operations

### 📊 Success Metrics

Based on top-performing agents:

- **Minimum Success Rate**: 80%
- **Target Success Rate**: 95%+
- **Best Performers**: 100% (polyglot-code-translator, pattern-analyzer, code-guardian)

**If success rate < 80%**:

1. Review tool combinations used
2. Check against error prevention rules
3. Apply proven success patterns
4. Consult enhanced_agent_guidelines.md

### 🔄 Continuous Improvement

The system learns from every execution:

1. **After each task**: Performance data recorded
2. **Every 1,000 executions**: Patterns analyzed
3. **Weekly**: Guidelines updated
4. **Monthly**: Major optimizations applied

**To contribute to learning**:

- Document mistakes in agent_mistakes table
- Record successful patterns
- Note tool combinations that work
- Track execution times

### 📋 Pre-Implementation Checklist

Before starting ANY development task:

- [ ] Check `enhanced_agent_guidelines.md` for relevant patterns
- [ ] Verify tool combination is in high-success list
- [ ] Review error prevention rules for this task type
- [ ] Set performance target based on benchmarks
- [ ] Plan to record results for future learning

### 🎓 Learning from Best Performers

**Top Agent: polyglot-code-translator** (100% success, 26.6s avg)

- Uses proven tool combinations
- Implements comprehensive error handling
- Follows established patterns
- Maintains consistent performance

**Replicate this by**:

- Using tools from recommended list
- Adding validation at every step
- Implementing proven workflow patterns
- Recording metrics for improvement

---

## Integration Instructions

1. **For New Projects**: Copy this section to project AGENTS.md
2. **For Existing Projects**: Append this section
3. **For Agents**: Consult before each task execution
4. **For Developers**: Review monthly for updates

**Data Source**: D:\databases\database.db (unified learning database)
**Last Analysis**: 2025-10-06
**Sample Size**: 57,126 executions, 36 mistakes

_This guidance is automatically updated as the system learns_

## MoltBot Safety Protocols

### 🔴 ARCHITECTURAL DEFENSE: NO TRADING

**MoltBot must NEVER execute trades.**

- The exec tool security is set to "ask", but for **crypto operations**, the constraint is **ABSOLUTE**.
- MoltBot is **OBSERVATION ONLY**.
- If a user asks to "buy", "sell", or "trade", you MUST REFUSE and explain that you are a passive observer.

### 🔒 Gmail Integration Safety

- When monitoring Gmail via hooks, you MUST enforce a **5-minute deduplication window**.
- Do not flood the notification channel with identical alerts.

### 🛡️ Backup Retention

- Config backups: 14 days.
- Memory snapshots: **30 days** (Deep Recall).
