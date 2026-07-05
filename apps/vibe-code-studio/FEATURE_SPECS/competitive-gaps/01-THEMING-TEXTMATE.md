# Feature Spec: VS Code Theme + TextMate Grammar Import

**Status**: 📋 PLANNED (PARTIAL — further along than first specced: `EditorSettings.theme` is already `string` (not a `'dark'|'light'` union), `EditorSettings.customThemeJson` exists, and `src/utils/themeLoader.ts#loadCustomTheme` already parses VS Code theme-JSON (`tokenColors` + `colors`) into `monaco.editor.defineTheme`. The real gap is the **tokenizer**: scopes are mapped onto Monarch token names, which mostly don't match TextMate scopes, so imported themes render with poor fidelity. This spec is a token-engine swap (Monarch → Shiki) + import/preset UX, not greenfield — verified against source 2026-07-03)
**Priority**: MEDIUM (cheap, day-one visible credibility — sequence FIRST in Wave 1)
**Effort**: S ≤3d — no server, no protocol, pure client-side tokenizer swap + theme-JSON mapping
**Competitor parity**: VS Code / all forks — "Color Theme" + "File Icon Theme" marketplace category; bring-your-own `.tmTheme`/theme-JSON
**Dependencies**: `shiki` + `@shikijs/monaco` (recommended), OR `monaco-editor-textmate` + `vscode-textmate` + `vscode-oniguruma` (alternative); existing `useEditorStore.ts`, `Settings.tsx`

---

## User Story

As a developer switching from VS Code/Cursor, I want to import my existing color theme and get accurate TextMate-grade syntax highlighting, so that VCS looks and feels like my editor on day one instead of a generic Monaco default.

## Why VCS lacks this today

VCS uses `@monaco-editor/react` with Monaco's built-in Monarch tokenizer (configured in `utils/monacoConfig.ts`, loaded via `LazyMonaco.tsx`). Monarch is a regex-per-line tokenizer, not a scope-based grammar engine — it cannot load `.tmLanguage.json` grammars, so highlighting fidelity is visibly weaker (no scope-based `punctuation.definition.tag`, no embedded-language boundaries like JSX-in-TS). A theme-JSON import path _does_ already exist (`themeLoader.ts#loadCustomTheme` + `EditorSettings.customThemeJson`), but it flattens TextMate `tokenColors` scopes onto Monarch token names — most scopes never match a Monarch token, so an imported theme applies its workbench `colors` correctly while token coloring stays mostly default. The fix is the tokenizer, not the parser. This is also the most visible first impression VCS makes on anyone evaluating it against Cursor/VS Code side-by-side, since syntax coloring is the first thing a developer's eye calibrates against.

## Acceptance Criteria

1. ⬜ Settings has a "Theme" section with a curated preset list (min. 8 themes: e.g. One Dark Pro, Dracula, GitHub Dark/Light, Nord, Monokai, Solarized Dark/Light) rendered via real TextMate grammars, not Monarch.
2. ⬜ User can drag-and-drop or file-pick a VS Code theme `.json` (the `contributes.themes` payload shape) and it applies live without reload.
3. ⬜ Legacy `.tmTheme` (plist/XML) import is supported as a documented fallback path.
4. ⬜ Theme selection persists across restarts via `useEditorStore` (zustand `persist` middleware, same pattern as `settings`).
5. ⬜ TypeScript, JavaScript, JSX/TSX, Python, Rust, JSON, Markdown, YAML, and CSS/SCSS all tokenize with the new engine (parity set with Phase 1 LSP languages in spec 07).
6. ⬜ Editor foreground/background/selection/cursor/gutter colors map from theme `colors` (workbench colors), not just `tokenColors`.
7. ⬜ Switching themes does not require reopening files; live `monaco.editor.setTheme()` re-render on all open editor instances.
8. ⬜ Fallback to existing Monarch dark/light theme if grammar/theme parse fails — never a blank/uncolored editor.
9. ⬜ Bundle-size budget: WASM oniguruma + grammar assets are lazy-loaded behind the same `Suspense` boundary as Monaco itself, not in the initial bundle.
10. ⬜ Theme picker UI shows a live preview snippet (fixed TS code sample) rendered in the candidate theme before applying.
11. ⬜ Terminal panel (`TerminalPanel.tsx`) ANSI colors are optionally derived from the active theme's `terminal.ansi*` color keys, so the editor and integrated terminal feel visually consistent rather than mismatched.

## Architecture / Solution

Two viable paths — **recommend Shiki** as the default, low-maintenance route:

**Path A (recommended): `shiki` + `@shikijs/monaco`**
Shiki ships the same TextMate grammars VS Code uses (via `vscode-textmate` internally) plus hundreds of themes, compiled to WASM oniguruma, and its `@shikijs/monaco` adapter directly registers a Monaco tokenizer via `shikiToMonaco()`. No manual grammar-loading pipeline to maintain.

```ts
// src/utils/monacoConfig.ts (extend existing configureMonaco())
import { createHighlighter } from 'shiki';
import { shikiToMonaco } from '@shikijs/monaco';
import * as monaco from 'monaco-editor';

export async function configureTextMateTheming(themeJson?: unknown) {
  const highlighter = await createHighlighter({
    themes: themeJson ? [] : ['one-dark-pro', 'dracula', 'github-dark'],
    langs: ['typescript', 'javascript', 'tsx', 'python', 'rust', 'json', 'markdown'],
  });
  if (themeJson) await highlighter.loadTheme(themeJson as never);
  shikiToMonaco(highlighter, monaco);
}
```

**Path B (documented alternative): `monaco-editor-textmate` + `vscode-textmate` + `vscode-oniguruma`**
More manual (you own grammar registration, `onigasm`/oniguruma WASM init, and scope-to-Monaco-token mapping) but gives finer control if a specific grammar Shiki doesn't ship is needed later.

**VS Code color-theme JSON → Monaco theme mapping** (needed either path, for `colors` block since Shiki only owns `tokenColors`). **Do not write this from scratch** — `src/utils/themeLoader.ts#loadCustomTheme` already implements this mapping (including the `type → base` and `colors` passthrough); extend it (drop its `tokenColors→Monarch rules` flattening once Shiki owns tokens) rather than adding a parallel `vscodeThemeToMonaco`:

```ts
function vscodeThemeToMonaco(theme: VSCodeColorTheme): monaco.editor.IStandaloneThemeData {
  return {
    base: theme.type === 'light' ? 'vs' : 'vs-dark',
    inherit: true,
    rules: [], // token rules come from shikiToMonaco, not here
    colors: {
      'editor.background': theme.colors['editor.background'] ?? '#1e1e1e',
      'editor.foreground': theme.colors['editor.foreground'] ?? '#d4d4d4',
      'editorCursor.foreground': theme.colors['editorCursor.foreground'] ?? '#aeafad',
      'editor.selectionBackground': theme.colors['editor.selectionBackground'] ?? '#264f78',
      'editorGutter.background': theme.colors['editorGutter.background'] ?? '#1e1e1e',
      // ...full workbench color set, ~40 keys
    },
  };
}
```

Data flow: Settings UI → file picker/drop-zone → parse JSON (or plist for `.tmTheme` via a small XML-plist parser) → `configureTextMateTheming(parsed)` → `monaco.editor.defineTheme('custom', mapped)` → `monaco.editor.setTheme('custom')` → persist `{ themeId, themeSource }` to `useEditorStore.settings`.

## Implementation (phased)

### Phase 1 — Shiki integration + curated presets

- `src/utils/monacoConfig.ts`: add `configureTextMateTheming()`, called from `LazyMonaco.tsx`'s existing lazy-load chain (same spot `configureMonaco()` runs today).
- `src/services/theme/ThemeRegistry.ts` (new): curated preset list, id → Shiki bundled-theme name mapping.
- `src/components/Settings/ThemeSection.tsx` (new): preset grid + live preview snippet.
- `EditorSettings.theme` is already `string` and `customThemeJson?: string` already exists in `src/types/index.ts` — only add `themeSource: 'preset' | 'imported'`.

### Phase 2 — Custom theme import

- `src/services/theme/ThemeImporter.ts` (new): VS Code theme-JSON parser + `.tmTheme` plist fallback parser (small dependency, e.g. `plist`).
- Drag-and-drop zone in `ThemeSection.tsx`; validation + graceful fallback to current theme on parse error (Acceptance Criterion 8).
- Wire persistence into `useEditorStore` (extend `partialize` in the persist config to include the new settings fields — already includes `settings` object wholesale, so no extra wiring needed there).

### Phase 3 — Open VSX theme browsing (feeds spec 18 Tier A)

- Once spec 18 Tier A ships an Open VSX client, add a "Browse more themes" action in `ThemeSection.tsx` that lists `contributes.themes` from Open VSX extension manifests and pipes the fetched JSON into the same `ThemeImporter` path — no new import code needed, just a new JSON source.

## Integration points (existing code to hook into)

- `src/components/Editor/LazyMonaco.tsx` — where `configureMonaco()` already runs before Monaco loads; add the TextMate/theme call in the same promise chain.
- `src/utils/monacoConfig.ts` — existing Monaco global configuration module (referenced by `LazyMonaco.tsx`), extend rather than replace.
- `src/components/Settings.tsx` — existing settings panel (`SettingsSection`, `SettingItem`, `Select` styled-components already defined in `Settings.styles.ts`); add `ThemeSection` as a new section following the same component pattern.
- `src/stores/useEditorStore.ts` — `EditorSettings` lives in `state.settings`, already covered by the `persist` middleware's `partialize` (includes `settings` wholesale); no store schema migration beyond widening the `theme` field type.
- Consumes: spec 18 Tier A (Open VSX theme browsing, Phase 3 above).

## Test Scenarios

**Vitest unit**

- `ThemeImporter.parse()` on a valid VS Code theme JSON fixture returns correct `IStandaloneThemeData`.
- `ThemeImporter.parse()` on malformed JSON throws a typed error, does not crash.
- `.tmTheme` plist fixture parses to the same normalized shape as JSON path.
- `vscodeThemeToMonaco()` maps all required workbench color keys with sane defaults for missing keys.

**Playwright e2e**

- Open Settings → Theme section → select preset → assert `.monaco-editor` background color changed via computed style.
- Drop a theme JSON file → assert live preview updates → Save → reload app → assert theme persisted.
- Drop a corrupt file → assert error toast + editor remains on prior theme (no blank render).
- Switch between two presets rapidly (5x) → assert no flicker to unstyled/black editor and final theme matches last selection.
- Open a workspace with all 8 Phase-1 languages represented across open tabs → switch theme → assert every open tab re-tokenizes without requiring a manual reopen.

## Success Metrics

- Time-to-first-highlighted-keystroke unaffected (WASM/grammar load lazy, off critical path) — no regression vs current ~2.45MB-saved Monaco lazy-load baseline.
- 100% of curated preset themes render with zero console errors across the 8 Phase-1 languages.
- Theme import success rate ≥95% on the top 20 most-downloaded VS Code themes (manually sampled from marketplace).
- Theme switch (preset-to-preset) completes and repaints all open editors in <150ms p95, no visible flash of unstyled content.

---

**Risks / Open questions**: Shiki's WASM oniguruma adds bundle weight — must confirm it stays behind the lazy boundary and doesn't regress the documented 2.45MB Monaco lazy-load win. `.tmTheme` plist parsing is a legacy format with looser spec compliance than theme-JSON; treat as best-effort, not guaranteed-correct. Icon themes (`contributes.iconThemes`) are explicitly out of scope for this spec — file-tree icons are a separate, smaller follow-up. Semantic-token layering (spec 07 Phase 3) will eventually need to take precedence over Shiki's TextMate scopes for LSP-aware languages — the theme-color mapping built here should not assume TextMate is the permanent, sole source of token color forever.
**Sequencing**: Wave 1, do FIRST — cheapest Wave 1 item, highest visible "does this feel like a real editor" payoff, and its output (grammar/theme pipeline) is what spec 18 Tier A's Open VSX theme browsing plugs into in Phase 3.
