---
name: warn-console-log
enabled: true
event: file
conditions:
  - field: file_path
    operator: regex_match
    pattern: \.(ts|tsx|js|jsx)$
  - field: new_text
    operator: regex_match
    pattern: console\.log\(
---

⚠️ **Console.log detected in production code!**

**Why this matters:**
- Debug logs shouldn't ship to production
- Console.log can expose sensitive data
- Impacts browser performance
- Makes debugging harder (clutter)

**Alternatives:**
- Remove before committing
- Use a proper logging library
- Use conditional debug builds: `if (import.meta.env.DEV) console.log(...)`
- Use debugger statements during development (remove after)

**Pre-commit hook will catch this**, but better to fix it now.
