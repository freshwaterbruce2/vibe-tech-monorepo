# Chrome DevTools Auto-Fix Rule

Priority: RECOMMENDED
Status: ACTIVE

## When chrome-devtools MCP flags small issues, auto-fix them

When the chrome-devtools MCP server reports diagnostic output (accessibility audits, missing attributes, minor CSS/HTML issues), apply fixes directly to the source files without asking.

### Auto-fix categories (apply immediately):

1. **Missing accessibility attributes** — `aria-label`, `aria-describedby`, `role`, `alt`, `type`, `id`
2. **Missing form attributes** — `type="text"`, `autocomplete`, `name`, `for`/`htmlFor`
3. **Color contrast warnings** — adjust foreground/background colors to meet WCAG AA
4. **Missing landmark roles** — add `<main>`, `<nav>`, `<header>`, `<footer>` where obvious
5. **Empty interactive elements** — add `aria-label` to icon-only buttons
6. **Duplicate IDs** — rename to unique values
7. **Tab order issues** — add/fix `tabIndex` where flagged

### Do NOT auto-fix (ask first):

- Layout or structural changes
- Removing existing functionality
- Changes that alter visual appearance significantly
- Performance suggestions that require architectural changes
- Any change touching more than 3 files

### Workflow:

1. Read the chrome-devtools diagnostic output
2. Identify the source file and element (map selector back to JSX/TSX)
3. Apply the minimal fix directly via Edit
4. Briefly note what was fixed (one line)
