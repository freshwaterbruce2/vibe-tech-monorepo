# Feature Spec: Extension Host + Open VSX Marketplace Compatibility

**Status**: 📋 PLANNED (PARTIAL — VCS has a custom `PluginManager`/`PluginMarketplace` with its own manifest/activation API, not VS Code-extension-API compatible, so the Open VSX ecosystem cannot run on it as-is)
**Priority**: MEDIUM (strategic, multi-quarter bet — not a sprint item)
**Effort**: Tier A (recommended first): M 1–2wk. Tier B (full extension host): XL 2+mo
**Competitor parity**: VS Code / Cursor / Antigravity — full `vscode` extension API + Open VSX / Marketplace ecosystem access
**Dependencies**: Open VSX REST API (open-vsx.org, Eclipse Foundation); existing `src/services/PluginManager.ts`, `src/components/PluginMarketplace.tsx`; feeds spec 01 (themes) and spec 07 (language configs) for Tier A

---

## User Story

As a developer with a curated set of VS Code extensions I rely on, I want to install compatible ones in VCS — or at minimum bring my themes, grammars, and snippets from the same ecosystem — so that switching editors doesn't mean starting my toolset from zero.

## Why VCS lacks this today

`src/services/PluginManager.ts` implements a bespoke plugin system: `IPlugin` with a `PluginManifest` (`id`, `name`, `version`, `dependencies`) and an `activate(context: PluginContext)` lifecycle where `context` exposes exactly three capabilities — `registerCommand`, `registerView`, `registerSidebarItem`. This is nothing like the real `vscode` API surface (which spans `commands`, `languages`, `window`, `workspace`, `debug`, `extensions`, webviews, tree views, status bar items, and hundreds of contribution points). `src/components/PluginMarketplace.tsx` browses VCS's own plugin registry, not Open VSX. As a result, the entire Open VSX/VS Code extension ecosystem — tens of thousands of published extensions — is currently inert to VCS; nothing published there can run.

## Acceptance Criteria (Tier A — pragmatic, recommended first)

1. ⬜ An Open VSX registry client can search/browse extensions via the open-vsx.org REST API from within `PluginMarketplace.tsx`.
2. ⬜ Only _inert, declarative-only_ extension categories are installable: `contributes.themes` (color themes), `contributes.grammars` + `contributes.languages` (TextMate grammars/language-configuration), `contributes.snippets`.
3. ⬜ Installing a theme extension from Open VSX feeds directly into spec 01's `ThemeImporter` pipeline — no duplicate theme-parsing code.
4. ⬜ Installing a grammar/language-configuration extension registers the language with Monaco (brackets, comments, folding rules) and, if spec 07 has shipped, offers it to the LSP language-server registry as a candidate `languageId`.
5. ⬜ Snippet extensions parse `.code-snippets`/language-scoped snippet JSON and register with Monaco's snippet provider.
6. ⬜ Any extension requiring JS/TS activation code (an actual extension host) is clearly marked "Not supported" in the marketplace UI with a one-line reason, never silently ignored or shown as installable.
7. ⬜ Existing VCS-native plugin model (`PluginManager.ts`) continues to operate unchanged and independently — Tier A is additive, not a replacement.
8. ⬜ Legal/attribution: UI clearly states extensions are sourced from Open VSX (Eclipse Foundation), not the Microsoft Marketplace.

## Acceptance Criteria (Tier B — strategic, deferred)

9. ⬜ A sandboxed Node process (Tauri sidecar) implements a documented _subset_ of the `vscode` API (`commands`, `languages`, `window`, `workspace`, `webview`, activation events) sufficient to run a defined compatibility-tested extension list.
10. ⬜ Extension host process isolation ensures a crashing/malicious extension cannot access the main app's Tauri IPC surface directly — mediated through a capability-scoped bridge.

## Architecture / Solution — present as two tiers, ship Tier A first

**Tier A data flow:**

```
PluginMarketplace.tsx
   │ search/browse
   ▼
OpenVsxClient.ts (REST: GET /api/{namespace}/{extension}, /api/-/search)
   │ download .vsix (it's a zip: package.json + contributed assets)
   ▼
VsixParser.ts — unzip, read package.json "contributes" block
   │ route by contribution type
   ├─ contributes.themes    → spec 01 ThemeImporter.parse()
   ├─ contributes.grammars  → MonacoLanguageRegistrar.ts (new)
   └─ contributes.snippets  → SnippetRegistrar.ts (new)
```

```ts
// src/services/marketplace/OpenVsxClient.ts (new)
const OPEN_VSX_API = 'https://open-vsx.org/api';

export async function searchExtensions(
  query: string,
  category?: 'themes' | 'grammars' | 'snippets'
) {
  const res = await fetch(`${OPEN_VSX_API}/-/search?query=${encodeURIComponent(query)}&size=25`);
  const { extensions } = await res.json();
  // filter client-side to declarative-only categories per Acceptance Criterion 2
  return extensions.filter(isDeclarativeOnlyExtension);
}

export async function fetchVsix(
  namespace: string,
  name: string,
  version: string
): Promise<ArrayBuffer> {
  const res = await fetch(
    `${OPEN_VSX_API}/${namespace}/${name}/${version}/file/${namespace}.${name}-${version}.vsix`
  );
  return res.arrayBuffer();
}
```

```ts
// src/services/marketplace/VsixParser.ts (new) — .vsix is a standard zip
import { unzipSync } from 'fflate'; // or JSZip

export function parseVsix(buffer: ArrayBuffer) {
  const files = unzipSync(new Uint8Array(buffer));
  const manifest = JSON.parse(new TextDecoder().decode(files['extension/package.json']));
  const { themes, grammars, languages, snippets } = manifest.contributes ?? {};
  const unsupported = detectUnsupportedContributions(manifest.contributes); // Acceptance Criterion 6
  return { manifest, themes, grammars, languages, snippets, unsupported, files };
}
```

**Tier B** (deferred) would run a Node sidecar hosting a `vscode` API shim, with each extension's `activate(context)` executed inside that sandboxed process; commands/webviews/tree-view contributions would bridge back to the React webview over a scoped Tauri IPC channel — architecturally similar to spec 07/12's sidecar-process pattern but with a much larger, long-lived, stateful surface (an actual API to maintain compatibility against as it evolves upstream).

### Legal / there-be-dragons (state clearly to the team before building either tier)

- **Microsoft's Marketplace Terms of Service forbid use by non-Microsoft-branded editors.** VCS cannot legally point at `marketplace.visualstudio.com`.
- **Open VSX (Eclipse Foundation) is the only lawful registry** for a non-Microsoft editor. It is free up to a modest rate limit; **above 75 req/s requires a paid Managed Registry, with Enterprise tiers starting around €100K/yr.** Client-side caching of search/metadata is mandatory to stay under the free tier during normal use.
- **Microsoft's own proprietary extensions are blocked even for well-funded forks** (Pylance, C# Dev Kit, Remote-SSH server component) — this is true for Cursor today and would be true for VCS. Tier A's declarative-only scope sidesteps this entirely since it never touches those extensions; Tier B would hit this wall immediately for any "parity with Cursor" ambition around those specific extensions.
- **Recommendation: ship Tier A now.** It delivers real, immediate ecosystem value (bring-your-theme, bring-your-grammar, bring-your-snippets) with a fraction of the legal and engineering exposure. Defer Tier B until product traction and a clear extension "must-have list" justify the platform-scale investment — and even then, scope Tier B's supported API surface narrowly rather than chasing full `vscode` API compatibility.

## Implementation (phased)

### Phase 1 — Tier A: Open VSX client + theme/grammar/snippet install

- `src/services/marketplace/OpenVsxClient.ts`, `src/services/marketplace/VsixParser.ts` (new).
- `src/services/marketplace/MonacoLanguageRegistrar.ts`, `src/services/marketplace/SnippetRegistrar.ts` (new).
- `src/components/PluginMarketplace.tsx`: add an "Open VSX" source tab alongside the existing VCS-native plugin listing; reuse existing marketplace list/card UI, swap the data source.
- Client-side response caching (localStorage or IndexedDB, short TTL) to stay well under Open VSX's free-tier rate limit.

### Phase 2 — Tier A polish: unsupported-extension messaging + curated defaults

- `detectUnsupportedContributions()` full contribution-point audit (Acceptance Criterion 6) — enumerate every `contributes.*` key an extension declares and classify supported vs. not.
- Ship a curated "recommended themes/grammars" starter list (same list spec 01's presets draw from) pre-resolved to specific Open VSX namespace/name/version, so first-run doesn't require a live search.

### Phase 3 — Tier B spike (do not commit scope until Phase 1/2 data justifies it)

- `src-tauri/src/extension_host.rs`: sidecar Node process spawn + scoped IPC bridge design doc.
- Define the _exact_ subset of `vscode` API to shim (start from the smallest set that runs 5-10 named target extensions end-to-end, not a general-purpose compatibility layer).
- Security review of the sandboxing/capability model before any extension execution code ships.

## Integration points (existing code to hook into)

- `src/services/PluginManager.ts` — existing VCS-native plugin system; remains fully independent and unchanged. Tier A extensions are NOT registered here — they flow through the new `marketplace/` services directly into their respective consumer systems (theme store, Monaco language registration, snippet provider), since they have no `activate()` lifecycle to manage.
- `src/components/PluginMarketplace.tsx` — existing marketplace browse/install UI; extend with an Open VSX source tab rather than building a parallel UI.
- Feeds spec 01 (Theming/TextMate) — `VsixParser`'s `themes` output is handed directly to spec 01's `ThemeImporter.parse()`.
- Feeds spec 07 (LSP) — `VsixParser`'s `languages` output (bracket/comment/folding config) registers with Monaco directly; if a grammar extension's `languageId` matches an entry in spec 07's `LanguageServerRegistry`, it becomes visible as a configured language rather than requiring manual setup.

## Test Scenarios

**Vitest unit**

- `parseVsix()` on a real downloaded theme-only `.vsix` fixture extracts `contributes.themes` correctly and reports zero unsupported contributions.
- `parseVsix()` on a fixture with `contributes.commands` (requires activation code) correctly flags it in `unsupported` with a clear reason string.
- `isDeclarativeOnlyExtension()` filter correctly excludes extensions with any `main`/`browser` entry point (a JS activation file) even if they also declare a theme.
- `OpenVsxClient` search request caching: repeated identical queries within TTL do not re-fetch.

**Playwright e2e**

- Search "dracula" in the Open VSX tab, install the theme extension, assert it appears in spec 01's theme picker and can be applied.
- Attempt to view a full-featured extension (e.g. one with commands + webviews), assert it's shown but marked "Not supported" rather than an install button.
- Simulate an Open VSX API failure (network mock), assert the marketplace UI shows a clear error state and the existing VCS-native plugin tab remains fully functional.

## Success Metrics

- Tier A: ≥90% of the top 50 most-downloaded Open VSX color themes install and render correctly.
- Zero regressions to the existing VCS-native plugin system (`PluginManager.ts` test suite stays green, unmodified).
- Open VSX API usage stays under free-tier rate limits during normal single-user usage (verified via request-count logging during dogfood period).

---

**Risks / Open questions**: Open VSX's catalog completeness varies by extension category — some popular VS Code extensions are Marketplace-only and never published to Open VSX at all (publisher choice), so Tier A's available theme/grammar/snippet set is a subset of what VS Code users expect, not the full catalog. `.vsix` unzip-in-browser needs a dependency decision (`fflate` vs `JSZip` vs Tauri-side unzip) — lean toward a small pure-JS unzip to avoid another Rust sidecar for what's a one-shot operation. Tier B's XL estimate assumes a narrow API subset; scope creep toward "general extension compatibility" would blow this out significantly and is explicitly not recommended.
**Sequencing**: Wave 3 (heavy/strategic), but Tier A specifically can be pulled forward — it has no hard dependency on Wave 2 items and directly amplifies spec 01 (ship Tier A any time after spec 01 lands). Tier B stays last-sequenced pending product-traction justification; do not schedule it into a committed roadmap wave without a follow-up scoping spec.
