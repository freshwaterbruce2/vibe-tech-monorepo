# Sync Report Template

Use this format when presenting ecosystem sync findings to the user.

---

```markdown
## Ecosystem Sync Report — [DATE]

**Trigger**: [manual / post-maintenance / post-dependency-update / emergency]
**Scope**: [full / skills-only / agents-only / mcp-only]

### Summary

| Metric             | Count |
| ------------------ | ----- |
| Components scanned | X     |
| 🔴 Breaking issues | X     |
| 🟡 Stale issues    | X     |
| 🟢 Cosmetic issues | X     |
| ⚪ All clear       | X     |

---

### 🔴 Breaking (fix immediately)

| ID        | Component         | File        | Issue                      | Required Fix          |
| --------- | ----------------- | ----------- | -------------------------- | --------------------- |
| [rule-id] | [skill/agent/mcp] | [path:line] | [what changed in monorepo] | [exact change needed] |

### 🟡 Stale (fix this session)

| ID        | Component         | File        | Issue          | Recommended Fix    |
| --------- | ----------------- | ----------- | -------------- | ------------------ |
| [rule-id] | [skill/agent/mcp] | [path:line] | [what drifted] | [suggested change] |

### 🟢 Cosmetic (fix when convenient)

| Component | Issue                 |
| --------- | --------------------- |
| [name]    | [minor inconsistency] |

---

### 📋 Proposed Actions

Priority-ordered list of fixes:

1. **[action]** — [scope] — [risk: none/low/medium] — [auto-fixable: yes/no]
2. **[action]** — [scope] — [risk] — [auto-fixable]
3. ...

---

### ⚡ Quick Fixes (auto-applicable)

These can be applied without review:

- [ ] [fix description]
- [ ] [fix description]

### 🔍 Manual Review Required

These need human judgment:

- [ ] [issue requiring decision]
- [ ] [issue requiring decision]

---

Approve all? Approve quick fixes only? Or specify individual items?
```

---

## Formatting Notes

- Always show the backup command at the top of Phase 4
- Group fixes by component (skills → agents → MCP → plugins)
- For auto-fixable items, show the exact before/after text
- For manual items, explain why human judgment is needed
- Keep total report under 100 lines when possible
