# Auto-Generate Skills & Agents System

**Last Updated:** 2026-01-18
**Status:** Production Ready
**Based on:** META-SKILL research (January 2026)

---

## Overview

This is a **self-improving AI system** that automatically generates new skills and agents by analyzing your usage patterns from the learning system database.

**What It Does:**

- 📊 Analyzes learning system data (`D:\databases\agent_learning.db`)
- 🔍 Identifies repeated workflows and high-success patterns
- 🤖 Auto-generates skills/agents using Gemini 3 Pro
- ✅ Presents candidates for user approval
- 📈 Monitors performance and deprecates low-performers
- 🔄 Self-improves based on success metrics

**Key Innovation:** This is a **META-SKILL** - a skill that creates other skills!

---

## Quick Start

### Prerequisites

1. **Learning System Database**
   - Location: `D:\databases\agent_learning.db`
   - Must have >30 days of data
   - Status: Check with `Test-Path "D:\databases\agent_learning.db"`

2. **Gemini API Key**

   ```powershell
   # Set your API key
   $env:GEMINI_API_KEY = "your-api-key-here"

   # Or add to PowerShell profile for persistence
   Add-Content $PROFILE "`n`$env:GEMINI_API_KEY = 'your-key'"
   ```

3. **SQLite Command-Line Tool**
   - Download: <https://www.sqlite.org/download.html>
   - Add to PATH or place in scripts directory

### First Run

```powershell
# Navigate to scripts directory
cd C:\dev\scripts\auto-generate-skills

# 1. Analyze patterns
.\Analyze-Patterns.ps1

# 2. Review analysis results
cat .agent\skills\auto-skill-creator\analysis\skill-candidates.csv

# 3. Generate a skill
.\Generate-Skill.ps1 -PatternName "component-creation"

# 4. Review generated skill
code .agent\skills\component-creation\SKILL.md

# 5. If approved, it's ready to use!
# Restart Antigravity IDE to activate
```

---

## Scripts Reference

### `Analyze-Patterns.ps1`

**Purpose:** Analyze learning database and identify skill/agent candidates

**Usage:**

```powershell
.\Analyze-Patterns.ps1 [-DaysBack <int>] [-MinSuccessRate <double>] [-MinOccurrences <int>]
```

**Parameters:**

- `-DaysBack` (default: 30) - How many days of history to analyze
- `-MinSuccessRate` (default: 0.8) - Minimum success rate threshold (80%)
- `-MinOccurrences` (default: 10) - Minimum times pattern must appear

**Output:**

- `.agent\skills\auto-skill-creator\analysis\tool-usage-patterns.csv`
- `.agent\skills\auto-skill-creator\analysis\workflow-patterns.csv`
- `.agent\skills\auto-skill-creator\analysis\error-patterns.csv`
- `.agent\skills\auto-skill-creator\analysis\code-patterns.csv`
- `.agent\skills\auto-skill-creator\analysis\skill-candidates.csv`

**Example:**

```powershell
# Analyze last 60 days with 90% success threshold
.\Analyze-Patterns.ps1 -DaysBack 60 -MinSuccessRate 0.9 -MinOccurrences 15
```

---

### `Generate-Skill.ps1`

**Purpose:** AI-powered skill generation using Gemini 3 Pro

**Usage:**

```powershell
.\Generate-Skill.ps1 -PatternName <string> [-Type <Skill|Agent>] [-OutputPath <path>]
```

**Parameters:**

- `-PatternName` (required) - Name of pattern from candidates list
- `-Type` (default: "Skill") - Generate "Skill" or "Agent"
- `-OutputPath` (optional) - Custom output path

**Requirements:**

- `GEMINI_API_KEY` environment variable must be set
- Internet connection for API calls
- Pattern must exist in analysis results

**Output:**

- `.agent\skills\<pattern-name>\SKILL.md`
- Generated using Gemini 3 Pro model
- Includes YAML frontmatter with metadata
- Full documentation with examples

**Example:**

```powershell
# Generate skill for component creation pattern
.\Generate-Skill.ps1 -PatternName "component-creation-workflow"

# Generate agent for Python APIs
.\Generate-Skill.ps1 -PatternName "python-api" -Type Agent
```

---

### `Monitor-GeneratedSkills.ps1`

**Purpose:** Track performance and recommend improvements/deprecation

**Usage:**

```powershell
.\Monitor-GeneratedSkills.ps1 [-Report <Weekly|Monthly|All>]
```

**Parameters:**

- `-Report` (default: "Weekly") - Time range for report

**What It Shows:**

- 🌟 High Performers (>85% success, >20 uses)
- ⚡ Medium Performers (60-85% success)
- ❌ Deprecation Candidates (<60% success after 20+ uses)
- 💤 Unused Skills (0 uses)

**Database:**

- Creates `generated_skills` table in learning database
- Tracks: name, success_rate, usage_count, user_rating
- Updates automatically as skills are used

**Example:**

```powershell
# Weekly performance review
.\Monitor-GeneratedSkills.ps1 -Report Weekly

# Monthly comprehensive review
.\Monitor-GeneratedSkills.ps1 -Report Monthly

# All-time statistics
.\Monitor-GeneratedSkills.ps1 -Report All
```

---

## Workflow Integration

### Antigravity Workflow

The `/generate-skills` workflow is located at:

- Path: `.agent\workflows\generate-skills.md`
- Trigger: Type `/generate-skills` in Antigravity
- Schedule: Daily at 9 AM (optional)

**Workflow Steps:**

1. Analyze learning data
2. Display candidates to user
3. Generate selected skills
4. User review & approval
5. Deploy approved skills
6. Track deployment
7. Monitor performance

### Manual Workflow

```powershell
# Weekly manual workflow (recommended)

# 1. Monday: Analyze patterns
cd C:\dev\scripts\auto-generate-skills
.\Analyze-Patterns.ps1

# 2. Review candidates
cat .agent\skills\auto-skill-creator\analysis\skill-candidates.csv

# 3. Generate promising skills
.\Generate-Skill.ps1 -PatternName "database-migration-workflow"

# 4. Review and edit
code .agent\skills\database-migration-workflow\SKILL.md

# 5. Test in Antigravity
# (Restart IDE to activate)

# 6. Monitor performance (Friday)
.\Monitor-GeneratedSkills.ps1 -Report Weekly
```

---

## Generation Criteria

### Skill Generation Thresholds

**MUST meet ALL criteria:**

- ✅ Repeated ≥10 times (statistical significance)
- ✅ Success rate ≥80% (proven effective)
- ✅ Multiple steps (not trivial one-liners)
- ✅ No existing skill covers it (anti-duplication)

**Confidence Score:**

```
Confidence = (success_rate * occurrences_weight * complexity_weight)

Where:
- success_rate: 0.0 to 1.0
- occurrences_weight: min(occurrences / 20, 1.0)
- complexity_weight: min(steps / 5, 1.0)

Minimum confidence: 0.75 (75%)
```

### Agent Generation Thresholds

**MUST meet ALL criteria:**

- ✅ Project category with ≥3 projects
- ✅ Consistent technology stack across projects
- ✅ Domain-specific expertise needed
- ✅ No existing agent covers it

---

## Safety Measures

### Before Generation

1. **Create Safety Snapshot**

   ```powershell
   cd C:\dev\scripts\version-control
   .\Save-Snapshot.ps1 -Description "Before skill generation"
   ```

2. **Verify Database Integrity**

   ```powershell
   sqlite3 D:\databases\agent_learning.db "PRAGMA integrity_check;"
   ```

3. **Check Data Sufficiency**
   - Minimum 30 days of data
   - At least 100 executions logged
   - Variety of tools and patterns

### Quality Assurance

**NEVER auto-generate for:**

- ❌ Financial operations (crypto trading logic)
- ❌ Destructive operations (file deletion, format)
- ❌ Security-sensitive (API keys, passwords)
- ❌ One-off tasks (<10 occurrences)

**ALWAYS require user approval:**

- ✅ Show preview before deployment
- ✅ Allow editing before finalizing
- ✅ Capture rejection reasons for learning

### Rollback Process

If generated skill causes issues:

```powershell
# 1. Restore pre-generation snapshot
cd C:\dev\scripts\version-control
.\Restore-Snapshot.ps1 -Tag "before-skill-generation"

# 2. Mark skill as deprecated
sqlite3 D:\databases\agent_learning.db @"
UPDATE generated_skills
SET deprecation_candidate = 1,
    notes = 'Caused issues - see logs'
WHERE name = 'problematic-skill';
"@

# 3. Remove skill directory
Remove-Item -Path ".agent\skills\problematic-skill" -Recurse -Force

# 4. Restart Antigravity
```

---

## Performance Monitoring

### Success Metrics

**Skill is successful if:**

- Success rate >85% after 20+ uses
- User rating ≥4 stars (if rated)
- No deprecation requests
- Actively used (not sitting idle)

**Skill needs improvement if:**

- Success rate 60-85%
- Low usage despite high need
- Mixed user feedback

**Skill should be deprecated if:**

- Success rate <60% after 20+ uses
- Unused for >60 days
- Superseded by better skill
- User requests removal

### Continuous Improvement

**Weekly Review (Mondays):**

```powershell
.\Monitor-GeneratedSkills.ps1 -Report Weekly
```

**Monthly Deep Dive:**

```powershell
.\Monitor-GeneratedSkills.ps1 -Report Monthly

# Analyze failures
sqlite3 D:\databases\agent_learning.db @"
SELECT tool_name, error_message, COUNT(*) as failures
FROM agent_executions
WHERE tool_name IN (SELECT name FROM generated_skills)
  AND success = 0
  AND timestamp >= datetime('now', '-30 days')
GROUP BY tool_name, error_message
ORDER BY failures DESC;
"@
```

---

## Meta-Learning

### What Makes Skills Successful?

**Analyze success factors:**

```sql
-- Find common patterns in high-performing skills
SELECT
    s.name,
    s.success_rate,
    COUNT(DISTINCT p.id) as unique_patterns,
    AVG(p.success_rate) as avg_pattern_success,
    GROUP_CONCAT(DISTINCT p.task_type) as related_tasks
FROM generated_skills s
JOIN task_patterns p ON p.task_type LIKE '%' || s.name || '%'
WHERE s.success_rate > 0.85 AND s.usage_count > 20
GROUP BY s.name
ORDER BY s.success_rate DESC;
```

**Success factors identified:**

1. Clear step-by-step instructions
2. Safety checks (snapshots, validation)
3. Error handling with rollback
4. User verification points
5. Integration with existing skills

**Apply to future generations:**

- Update Gemini prompts with successful patterns
- Adjust confidence thresholds
- Refine pattern detection SQL queries

---

## Troubleshooting

### Issue: No Patterns Found

**Symptoms:**

- `Analyze-Patterns.ps1` returns 0 candidates
- Learning database has insufficient data

**Solutions:**

```powershell
# 1. Check database size
sqlite3 D:\databases\agent_learning.db @"
SELECT
    COUNT(*) as total_executions,
    COUNT(DISTINCT tool_name) as unique_tools,
    MIN(timestamp) as earliest_record,
    MAX(timestamp) as latest_record
FROM agent_executions;
"@

# 2. Lower thresholds temporarily
.\Analyze-Patterns.ps1 -MinOccurrences 5 -MinSuccessRate 0.7

# 3. Wait for more data to accumulate
# (System needs ~30 days for meaningful patterns)
```

### Issue: Gemini API Errors

**Symptoms:**

- `Generate-Skill.ps1` fails with API errors
- Timeouts or rate limiting

**Solutions:**

```powershell
# 1. Verify API key
$env:GEMINI_API_KEY
# Should output your key, not empty

# 2. Check API quotas
# Visit: https://aistudio.google.com/

# 3. Test API connection
Invoke-RestMethod -Uri "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro?key=$env:GEMINI_API_KEY"

# 4. Wait and retry (rate limiting resets hourly)
```

### Issue: Generated Skill Not Working

**Symptoms:**

- Skill generates but fails when used
- Low success rate immediately

**Solutions:**

```powershell
# 1. Check skill syntax
code .agent\skills\<skill-name>\SKILL.md
# Verify YAML frontmatter is valid

# 2. Test pattern manually
# Run the workflow steps manually to verify

# 3. Check for monorepo-specific paths
# Ensure C:\dev\ and D:\ paths are correct

# 4. Mark for review
sqlite3 D:\databases\agent_learning.db @"
UPDATE generated_skills
SET notes = 'Needs manual review - low initial success'
WHERE name = '<skill-name>';
"@
```

---

## Database Schema

### `generated_skills` Table

```sql
CREATE TABLE generated_skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL,  -- 'skill' or 'agent'
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    success_rate REAL DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    user_rating INTEGER,  -- 1-5 stars
    deprecation_candidate BOOLEAN DEFAULT 0,
    last_used TIMESTAMP,
    notes TEXT
);
```

**Indexes:**

```sql
CREATE INDEX idx_generated_skills_success ON generated_skills(success_rate DESC);
CREATE INDEX idx_generated_skills_usage ON generated_skills(usage_count DESC);
CREATE INDEX idx_generated_skills_deprecated ON generated_skills(deprecation_candidate);
```

---

## File Structure

```
C:\dev\
├── scripts\
│   └── auto-generate-skills\
│       ├── README.md (this file)
│       ├── Analyze-Patterns.ps1
│       ├── Generate-Skill.ps1
│       └── Monitor-GeneratedSkills.ps1
├── .agent\
│   ├── workflows\
│   │   └── generate-skills.md
│   └── skills\
│       ├── auto-skill-creator\
│       │   ├── SKILL.md (META-SKILL spec)
│       │   ├── analysis\ (pattern analysis results)
│       │   │   ├── tool-usage-patterns.csv
│       │   │   ├── workflow-patterns.csv
│       │   │   ├── error-patterns.csv
│       │   │   ├── code-patterns.csv
│       │   │   └── skill-candidates.csv
│       │   └── deployments\ (deployment logs)
│       │       └── deployment-log.json
│       └── <generated-skills>\ (auto-generated)
└── D:\
    ├── databases\
    │   └── agent_learning.db (primary data source)
    └── learning-system\
        └── learning_engine.py
```

---

## Related Documentation

- **META-SKILL Spec**: `.agent/skills/auto-skill-creator/SKILL.md`
- **Workflow**: `.agent/workflows/generate-skills.md`
- **Learning System**: `C:\dev\docs\LEARNING_SYSTEM.md`
- **Antigravity README**: `.antigravity/README.md`

---

## Future Enhancements

**Planned Features:**

1. **A/B Testing** - Generate variations and test performance
2. **Agent Auto-Generation** - Detect new project categories automatically
3. **Cross-Skill Patterns** - Identify skill combinations
4. **User Preference Learning** - Adapt to user's coding style
5. **Integration with GitHub Copilot** - Use copilot suggestions as patterns

---

**Status:** ✅ Production Ready
**Version:** 1.0.0
**Last Updated:** 2026-01-18

**This is the future of AI-assisted development!** 🚀
