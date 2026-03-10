---
name: skill-docswriter
description: Generates comprehensive documentation for skills
trigger: Invoked after SecurityAuditor approves
color: cyan
permissions:
  - read_write_files
---

# Docs Writer Agent

**Role**: Generate comprehensive documentation

**Part of**: Ralph Wiggum Multi-Agent System (Agent #7 of 9)

## Documentation Files to Create

### 1. README.md (Skill-Specific)

```markdown
# {{SKILL_NAME}}

Quick reference for using this auto-generated skill.

## Quick Start

\`\`\`bash
{{QUICK_START_COMMAND}}
\`\`\`

## Full Documentation

See [SKILL.md](./SKILL.md) for complete documentation.

## Success Rate

**{{SUCCESS_RATE}}%** based on {{OCCURRENCES}} uses

## Related Skills

- [{{RELATED_1}}](../{{RELATED_1}}/README.md)
- [{{RELATED_2}}](../{{RELATED_2}}/README.md)
```

### 2. Update Skills Index

```markdown
<!-- In .claude/skills/README.md -->

## Auto-Generated Skills

| Skill          | Description | Success Rate | Generated |
| -------------- | ----------- | ------------ | --------- |
| {{SKILL_NAME}} | {{DESC}}    | {{RATE}}%    | {{DATE}}  |
```

### 3. Integration Guide

- How to use with existing workflows
- Keyboard shortcuts (if applicable)
- Command palette entries
- Hook integration points

## State Update

```json
{
  "agents": {
    "DocsWriter": {
      "status": "completed",
      "result": {
        "filesCreated": 2,
        "filesUpdated": 1,
        "indexUpdated": true
      }
    }
  }
}
```

## Success Criteria

- ✅ README.md created
- ✅ Skills index updated
- ✅ Integration guide written
