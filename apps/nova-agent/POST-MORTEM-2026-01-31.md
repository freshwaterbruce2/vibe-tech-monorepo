# Post-Mortem: Nova Agent UI Regression (2026-01-31)

## Summary
The Nova Agent dashboard UI broke - metrics displayed in a single column instead of a 4-column grid, and responsive layouts failed across the app.

---

## 1. WHAT HAPPENED

### The Symptom
- Metrics (Daily Activity, Active Memory, etc.) stacked vertically instead of 4-column grid
- Quick Actions buttons not in proper grid layout
- All responsive Tailwind classes (`md:`, `lg:`) stopped working

### The Root Cause
**Invalid CSS selector syntax in fallback utilities.**

In `src/index.css`, the responsive utility fallbacks used double-escaped backslashes:
```css
/* WRONG - double backslash */
.lg\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }

/* CORRECT - single backslash */
.lg\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
```

**Why this matters:**
- In CSS, `\:` escapes the colon → matches class `lg:grid-cols-4` ✓
- In CSS, `\\:` is a literal backslash followed by colon → matches class `lg\:grid-cols-4` ✗

The browser silently discarded all rules inside the `@media (min-width: 1024px)` block because the selectors were invalid.

---

## 2. HOW IT HAPPENED

### Timeline
1. **Original state:** Modular CSS with separate files (`utilities.css`, `theme-variables.css`, etc.) that Tailwind JIT-compiled correctly
2. **Refactor:** CSS consolidated into single `index.css` with explicit utility fallbacks
3. **The mistake:** When writing fallback CSS for responsive classes, `\\:` was used instead of `\:`
4. **Undetected:** Base styles worked, only responsive variants failed - easy to miss visually

### Contributing Factors
1. **No visual regression tests** - Changes to CSS aren't validated against known-good screenshots
2. **No CSS linting** - Stylelint or similar would catch invalid selectors
3. **Responsive breakpoint blindness** - Dev testing often happens at one viewport size
4. **Silent CSS failures** - Browsers don't error on invalid selectors, they just skip them

---

## 3. HOW TO PREVENT THIS

### Immediate Actions (Do Now)

#### A. Add Stylelint for CSS Validation
```bash
pnpm add -D stylelint stylelint-config-standard
```

Create `.stylelintrc.json`:
```json
{
  "extends": "stylelint-config-standard",
  "rules": {
    "selector-class-pattern": null,
    "no-descending-specificity": null
  }
}
```

Add to `package.json`:
```json
"scripts": {
  "lint:css": "stylelint 'src/**/*.css'"
}
```

#### B. Add Visual Regression Tests with Playwright
```bash
pnpm add -D @playwright/test
```

Create `e2e/visual.spec.ts`:
```typescript
import { test, expect } from '@playwright/test';

test('dashboard layout at lg breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  await expect(page).toHaveScreenshot('dashboard-lg.png');
});

test('dashboard layout at md breakpoint', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 800 });
  await page.goto('/');
  await expect(page).toHaveScreenshot('dashboard-md.png');
});

test('dashboard layout at mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/');
  await expect(page).toHaveScreenshot('dashboard-mobile.png');
});
```

#### C. Add Pre-Commit Hook
```bash
pnpm add -D husky lint-staged
npx husky init
```

`.husky/pre-commit`:
```bash
pnpm lint:css
pnpm test:visual
```

### Process Changes

#### D. Multi-Viewport Testing Checklist
Before any CSS changes are merged:
- [ ] Tested at 1280px+ (lg breakpoint)
- [ ] Tested at 768px-1023px (md breakpoint)  
- [ ] Tested at <768px (mobile)
- [ ] Visual regression tests pass

#### E. CSS Change Review Policy
1. **Never refactor working CSS without tests** - Add visual regression tests BEFORE refactoring
2. **Incremental changes** - Don't consolidate 10 CSS files in one commit
3. **Validate selectors** - Run `stylelint` on any CSS changes

### Long-term Improvements

#### F. Consider CSS-in-JS or Atomic CSS
If Tailwind escaping issues persist, consider:
- **Tailwind v4 first-class Vite plugin** (simpler config)
- **Vanilla Extract** (type-safe CSS, compile-time validation)
- **StyleX** (Facebook's atomic CSS with validation)

#### G. CI Pipeline Additions
```yaml
# .github/workflows/ci.yml or similar
steps:
  - name: lint-css
    commands:
      - pnpm lint:css

  - name: visual-regression
    commands:
      - pnpm test:visual
    when:
      path: ["apps/nova-agent/src/**/*.css", "apps/nova-agent/src/**/*.tsx"]
```

---

## 4. THE FIX

**File:** `apps/nova-agent/src/index.css`

**Change:** Replace all `\\:` with `\:` in responsive media query selectors

```diff
  @media (min-width: 768px) {
-    .md\\:flex { display: flex !important; }
-    .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
+    .md\:flex { display: flex !important; }
+    .md\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
  }
  
  @media (min-width: 1024px) {
-    .lg\\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
-    .lg\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
-    .lg\\:col-span-2 { grid-column: span 2 / span 2 !important; }
+    .lg\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
+    .lg\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
+    .lg\:col-span-2 { grid-column: span 2 / span 2 !important; }
  }
```

---

## Lessons Learned

1. **CSS fails silently** - Invalid selectors don't throw errors, they just don't match
2. **Escaping is tricky** - `\:` in CSS is not `\\:` - know your escape sequences
3. **Responsive layouts need responsive testing** - One viewport size isn't enough
4. **Visual regression tests are essential** - Screenshots catch what lint can't
5. **Refactors need safety nets** - Never consolidate without tests first

---

## Action Items

| Priority | Task | Owner | ETA |
|----------|------|-------|-----|
| P0 | Fix applied ✓ | Vibe | Done |
| P1 | Add Stylelint | TBD | This week |
| P1 | Add Playwright visual tests | TBD | This week |
| P2 | Add pre-commit hooks | TBD | Next week |
| P2 | Update CI pipeline | TBD | Next week |

---

*Post-mortem written: 2026-01-31*
