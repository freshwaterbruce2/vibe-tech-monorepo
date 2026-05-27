# Tailwind v4 Migration Assessment (ARCH-1.3)

This document provides a comprehensive migration assessment for transitioning `apps/vibe-tutor` from Tailwind CSS v3.4.15 to Tailwind CSS v4.1.18, aligning it with the VibeTech monorepo root standards.

---

## 1. Executive Summary

- **App Target:** [vibe-tutor](file:///C:/dev/apps/vibe-tutor)
- **Current Version:** v3.4.15 (configured via a pnpm override in root [package.json](file:///C:/dev/package.json#L29))
- **Target Version:** v4.1.18 (monorepo root standard)
- **Migration Strategy:** CSS-first configuration via Vite Plugin (`@tailwindcss/vite`), eliminating `tailwind.config.cjs` and legacy PostCSS pipeline.
- **Estimated Effort:** **24 hours** (including build validation, dependency resolution, manual theme verification, and multi-platform testing across Electron and Capacitor/Android targets).
- **Risk Level:** **LOW to MEDIUM** (low impact on logic, medium risk of UI layout regressions due to changes in compiler engines, container queries, and utility resolution).

---

## 2. Current Tailwind v3 Config & Dependencies

In `apps/vibe-tutor`, Tailwind is set up using traditional PostCSS and a configuration file:

### 2.1 Configuration File Analysis
- **Path:** [tailwind.config.cjs](file:///C:/dev/apps/vibe-tutor/tailwind.config.cjs)
- **Content Coverage:**
  - Content paths target `index.html` and `./src/**/*.{ts,tsx}`.
  - **Extended Colors:** Maps custom semantic keys to CSS custom properties defined in [theme.css](file:///C:/dev/apps/vibe-tutor/src/styles/theme.css):
    - `'background-main': 'var(--background-main)'`
    - `'background-card': 'var(--background-card)'`
    - `'background-surface': 'var(--background-surface)'`
    - `'glass-surface': 'var(--glass-surface)'`
    - `'glass-border': 'var(--glass-border)'`
    - `'primary-accent': 'var(--primary-accent)'`
    - `'secondary-accent': 'var(--secondary-accent)'`
    - `'tertiary-accent': 'var(--tertiary-accent)'`
    - `'quaternary-accent': 'var(--quaternary-accent)'`
    - `'energy-accent': 'var(--energy-accent)'`
    - `'text-primary': 'var(--text-primary)'`
    - `'text-secondary': 'var(--text-secondary)'`
    - `'text-muted': 'var(--text-muted)'`
    - `'text-tertiary': 'var(--text-tertiary)'`
    - `'text-placeholder': 'var(--text-placeholder)'`
    - `'token-color': 'var(--token-color)'`
  - **Extended Spacing/Sizing:**
    - `minHeight` extended with `touch` (`48px`) and `touch-sm` (`44px`).
    - `minWidth` extended with `touch` (`48px`) and `touch-sm` (`44px`).

### 2.2 PostCSS Setup
- **Path:** [postcss.config.cjs](file:///C:/dev/apps/vibe-tutor/postcss.config.cjs)
- **Plugins:** Standard `tailwindcss` and `autoprefixer` execution.

### 2.3 Dependencies
- **Path:** [package.json](file:///C:/dev/apps/vibe-tutor/package.json#L91-L92)
  - `"tailwindcss": "3.4.15"`
  - `"postcss": "^8.5.12"`
  - `"autoprefixer": "^10.5.0"`
- **Root Override:** [package.json](file:///C:/dev/package.json#L29)
  - `"vibe-tutor>tailwindcss": "3.4.15"` overrides the workspace standard `4.1.18` specifically for this project.

---

## 3. Tailwind Class Usage Analysis

`vibe-tutor` leverages a mix of tailwind classes and custom CSS. Primary usage targets:
1. **Layout & Flex/Grid:** Heavy use of `flex`, `flex-col`, `grid`, `gap-*`, `items-center`, `justify-between` for dashboard structures and game hubs.
2. **Interactive Elements:** Min-size accessibility anchors (`min-h-touch`, `min-w-touch`, `min-h-touch-sm`, `min-w-touch-sm`) to support Capacitor touch targets.
3. **Themed Aesthetics:** Custom color mappings like `bg-background-main`, `text-text-secondary`, `border-glass-border`, `text-primary-accent`, `bg-glass-surface` styling glassmorphic cards and containers.
4. **Platform-Safe Spacers:** Dynamic positioning class names paired with custom CSS helpers (e.g. `pb-mobile-nav-safe`, `sidebar-safe-bottom`) which consume `env(safe-area-inset-bottom)`.

---

## 4. Contrast: vibe-tutor v3 vs. Monorepo Root v4

| Dimension | Legacy vibe-tutor Setup (v3) | Root Workspace Standard (v4) |
|---|---|---|
| **Tailwind Core** | `tailwindcss@3.4.15` | `tailwindcss@4.1.18` |
| **Engine** | JIT Engine (JS-based) | Oxide compiler (Rust-based, 10x faster) |
| **Configuration** | `tailwind.config.cjs` | CSS-native `@theme` in stylesheet |
| **Vite Integration** | PostCSS pipeline | Native `@tailwindcss/vite` plugin |
| **Directives** | `@tailwind base; @tailwind components; @tailwind utilities;` | `@import "tailwindcss";` |
| **Container Queries** | Requires external plugin (optional) | Built-in native container query support (`@container`, `@md:`) |

---

## 5. Migration Execution Plan

To migrate `vibe-tutor` to Tailwind v4, the following steps will be executed:

### Step 5.1: Package and Environment Alignment
1. **Remove Local Tailwind Dependencies:** Remove `tailwindcss`, `postcss`, and `autoprefixer` from `apps/vibe-tutor/package.json`.
2. **Remove pnpm Override:** Delete `"vibe-tutor>tailwindcss": "3.4.15"` from the root [package.json](file:///C:/dev/package.json).
3. **Install Vite Plugin:** Install `@tailwindcss/vite` in `apps/vibe-tutor/package.json` devDependencies.

### Step 5.2: CSS and Theme Config Relocation
1. **Update Imports:** In [index.css](file:///C:/dev/apps/vibe-tutor/src/index.css), replace:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```
   with:
   ```css
   @import "tailwindcss";
   ```
2. **Define Theme Overrides:** Convert `tailwind.config.cjs` declarations to a CSS-native `@theme` block in [index.css](file:///C:/dev/apps/vibe-tutor/src/index.css):
   ```css
   @theme {
     --color-background-main: var(--background-main);
     --color-background-card: var(--background-card);
     --color-background-surface: var(--background-surface);
     --color-glass-surface: var(--glass-surface);
     --color-glass-border: var(--glass-border);
     --color-primary-accent: var(--primary-accent);
     --color-secondary-accent: var(--secondary-accent);
     --color-tertiary-accent: var(--tertiary-accent);
     --color-quaternary-accent: var(--quaternary-accent);
     --color-energy-accent: var(--energy-accent);
     --color-text-primary: var(--text-primary);
     --color-text-secondary: var(--text-secondary);
     --color-text-muted: var(--text-muted);
     --color-text-tertiary: var(--text-tertiary);
     --color-text-placeholder: var(--text-placeholder);
     --color-token-color: var(--token-color);

     --min-height-touch: 48px;
     --min-height-touch-sm: 44px;
     --min-width-touch: 48px;
     --min-width-touch-sm: 44px;
   }
   ```
3. **Delete Configuration Files:**
   - Remove `tailwind.config.cjs`
   - Remove `postcss.config.cjs`

### Step 5.3: Build System Refactoring
1. **Update Vite Configuration:** Modify [vite.config.ts](file:///C:/dev/apps/vibe-tutor/vite.config.ts) to register the `@tailwindcss/vite` plugin:
   ```typescript
   import tailwindcss from '@tailwindcss/vite';
   
   // In plugins array:
   plugins: [
     react(),
     tailwindcss(),
     visualizer({...})
   ]
   ```

---

## 6. Effort & Risk Analysis

- **Estimated Duration Breakdown:**
  - Dependency adjustment and configuration files clean-up: **2 hours**
  - Theme relocation and CSS adjustments: **4 hours**
  - Compilation & Build Validation (checking for bundle regressions): **6 hours**
  - E2E Playwright verification & Visual layout checks: **6 hours**
  - Mobile emulator testing (Capacitor/Android touch layouts): **6 hours**
- **Risk Mitigation:**
  - Maintain absolute backup of styling configurations.
  - Run regression tests to verify that container queries and custom viewport settings didn't shift target dimensions.

---

## 7. Migration Verification Checklist

- [x] Documented Tailwind v3 setup and configuration overrides in `vibe-tutor`.
- [x] Analyzed utility classes and customized themes within component files.
- [x] Evaluated differences compared to the monorepo standard.
- [x] Defined complete migration plan using Vite integration.
- [x] Outlined step-by-step instructions and estimated ~24 hours of labor.
