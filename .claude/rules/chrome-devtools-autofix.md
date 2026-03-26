# Chrome DevTools Auto-Fix Rule

When chrome-devtools MCP reports diagnostics, apply small fixes directly without asking.

**Auto-fix immediately:** missing `aria-label`/`role`/`alt`/`type`/`id`, missing form attributes (`autocomplete`, `name`, `htmlFor`), color contrast (WCAG AA), missing landmark elements, `aria-label` on icon-only buttons, duplicate IDs, `tabIndex` issues.

**Ask first:** layout/structural changes, removing functionality, significant visual changes, performance requiring architecture changes, or changes touching more than 3 files.

**Workflow:** read diagnostic → map selector to JSX/TSX → apply minimal fix via Edit → note what was fixed (one line).
