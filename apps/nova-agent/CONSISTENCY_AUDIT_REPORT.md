# NOVA Agent Consistency & Security Audit Report

**App:** `apps/nova-agent`  
**Version Under Audit:** `1.3.0`  
**Audit Date:** 2026-05-07  
**Git Commit SHA:** `c8c6395f829b3013394354f34070277f312bf147`  
**Auditor:** Agent C — Project Consistency & Security Audit  

---

## 1. Version Alignment Check

| File | Expected | Actual | Status |
|------|----------|--------|--------|
| `package.json` | `1.3.0` | `1.3.0` | ✅ Pass |
| `src-tauri/tauri.conf.json` | `1.3.0` | `1.3.0` | ✅ Pass |
| `src-tauri/Cargo.toml` | `1.3.0` | `1.3.0` | ✅ Pass |
| `src-tauri/Cargo.lock` (nova-agent pkg) | `1.3.0` | `1.3.0` | ✅ Pass |
| `vibe-app.json` | `1.3.0` | `1.3.0` | ✅ Pass |
| `RELEASE_NOTES_v1.3.0.md` | `v1.3.0` | `v1.3.0` | ✅ Pass |

**Result:** All version references are aligned. **PASS**

---

## 2. Security Configuration Audit

### 2.1 CSP Policy (`tauri.conf.json`)

| Directive | Value | Assessment |
|-----------|-------|------------|
| `default-src` | `'self' data:` | ✅ Restrictive |
| `img-src` | `'self' data: https: asset: http://asset.localhost` | ⚠️ `https:` is broad; required for external avatars/web images. `asset:` needed for Tauri assets. |
| `connect-src` | `'self' ipc: http://ipc.localhost` + 8 localhost ports + 4 external APIs | ⚠️ Broad. Includes many localhost ports (`:3001`, `:3100`, `:3200`, `:5187`, `:8000`, `:8001`, `:9001`, `:11434`) and external domains (`openrouter.ai`, `moonshot.ai`, `deepseek.com`, `groq.com`). Necessary for current feature set but increases attack surface. |
| `script-src` | `'self'` | ✅ Restrictive |
| `style-src` | `'self' 'unsafe-inline'` | ⚠️ `'unsafe-inline'` is common for styled components but weakens XSS defenses. Consider hashing or nonce if feasible. |
| `font-src` | `'self' data:` | ✅ Restrictive |

**CSP Finding:** No critical misconfigurations, but `connect-src` is wide. Recommend documenting each localhost port and external domain with a comment in `tauri.conf.json`.

### 2.2 Capabilities (`src-tauri/capabilities/`)

| File | Permissions | Assessment |
|------|-------------|------------|
| `default.json` | `core:app:default`, `core:event:default`, `core:window:default`, `core:webview:default` | ✅ Minimal and appropriate. No filesystem, shell, or HTTP permissions granted at the capability level. |

**Result:** No overly broad capabilities. **PASS**

### 2.3 Environment Variables

| File | Status | Contents |
|------|--------|----------|
| `.env.example` | ⚠️ Exists but **incomplete** | Only `VITE_GRAVITY_CLAW_URL` documented |
| `.env` | ✅ Exists | `VITE_GRAVITY_CLAW_URL` present |

**Missing from `.env.example` (referenced in source code):**

- [ ] `VITE_API_URL`
- [ ] `VITE_CRYPTO_API_URL`
- [ ] `VITE_FEATURE_FLAGS`
- [ ] `VITE_GRAVITY_CLAW_MODEL`
- [ ] `VITE_KIMI_API_KEY`
- [ ] `VITE_MOONSHOT_API_KEY`
- [ ] `NOVA_REVIEW_ARTIFACT_DIR`
- [ ] `NOVA_LOG_DIR` (Rust side)
- [ ] `NOVA_DEFAULT_MODEL` (Rust side)
- [ ] `NOVA_MOBILE_BRIDGE_PORT` (Rust side)
- [ ] `NOVA_MOBILE_BRIDGE_TOKEN` (Rust side)
- [ ] `NOVA_MOBILE_LAN_ENABLED` (Rust side)
- [ ] `NOVA_DATABASE_PATH` (implied by `Config::from_env`)

**Recommendation:** Expand `.env.example` to include all documented environment variables with safe defaults or placeholder comments.

### 2.4 HTTP Mobile Bridge Binding (`src-tauri/src/http_server.rs`)

| Mode | Bind Address | Assessment |
|------|--------------|------------|
| **Default** (`NOVA_MOBILE_LAN_ENABLED` unset/false) | `127.0.0.1` | ✅ Localhost-only |
| **LAN mode** (`NOVA_MOBILE_LAN_ENABLED=true`) | `0.0.0.0` | ⚠️ Opens to all network interfaces. Protected by CORS + bearer token auth, but increases exposure. |

**Finding:** Defaults to `127.0.0.1` as required. LAN mode is opt-in via environment variable and requires `NOVA_MOBILE_BRIDGE_TOKEN` for authentication. This is acceptable but should be clearly documented in `.env.example` and security docs.

---

## 3. Bundle Asset Verification

| Asset | Required | Exists | Status |
|-------|----------|--------|--------|
| `src-tauri/icons/icon.ico` | Yes (Windows) | ✅ Yes | Pass |
| `src-tauri/icons/icon.png` | Yes (macOS/Linux) | ❌ No | ⚠️ Missing |
| `public/favicon.svg` | Frontend | ✅ Yes | Pass |
| `LICENSE` or `LICENSE.md` | Some bundlers | ❌ No | ⚠️ Missing |

**Findings:**
- Only `icon.ico` is present in the `icons/` directory. `tauri.conf.json` only references `icon.ico`, so Windows builds are unaffected. However, **macOS and Linux bundles will fail or use a default icon** because Tauri expects `.png` variants (`32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.png`).
- `LICENSE` / `LICENSE.md` is absent. Tauri bundlers for some targets (notably MSI/NSIS on Windows) may emit a warning or require it for code-signing workflows.

**Recommendations:**
- [ ] Generate required PNG icon sizes for cross-platform bundling.
- [ ] Add a `LICENSE.md` file to the app root (MIT, per `package.json` and `Cargo.toml`).

---

## 4. Dependency Vulnerability Check

### 4.1 `pnpm audit` — Direct & Transitive Findings Affecting nova-agent

| Severity | Package | Via | Path | Advisory |
|----------|---------|-----|------|----------|
| 🔴 **Critical** | `protobufjs` | `@xenova/transformers` | `packages/backend` | GHSA-xq3m-2v4x-88gg |
| 🟠 **High** | `lodash-es` | `react-big-calendar` | `apps/nova-agent` | GHSA-r5fr-rjxr-66jc |
| 🟠 **High** | `vite` | root/devDep | `apps/nova-agent` | GHSA-v2wj-q39q-566r, GHSA-p9ff-h696-f583 |
| 🟠 **High** | `rollup` | `@nx/rollup` | workspace | GHSA-mw96-cpmx-2vgc |
| 🟠 **High** | `axios` | `nx` / direct | workspace / `apps/nova-agent` | GHSA-pmwg-cvhr-8vh7, GHSA-q8qp-cvcw-x6jj, GHSA-pf86-5x62-jrwf, GHSA-6chq-wfr3-2hj9 |
| 🟠 **High** | `fast-uri` | `ajv` → `commitlint` | dev dependency | GHSA-q3j6-qgpj-74h6, GHSA-v39h-62p7-jpjc |
| 🟠 **High** | `@babel/plugin-transform-modules-systemjs` | `@nx/js` | workspace | GHSA-fv7c-fp4j-7gwp |
| 🟠 **High** | `inngest` | direct | `packages/inngest-client` | GHSA-2jf5-6wwv-vhxx |

**Nova-Agent Direct Exposure:**
- `lodash-es` (via `react-big-calendar@1.19.4`) — **Code Injection via `_.template`**
- `vite@7.3.1` — **Arbitrary File Read / `server.fs.deny` bypass** (dev server only, not production)

**High/Critical Count:** ~8 distinct high/critical advisories touch the dependency graph; **2 directly affect nova-agent runtime** (`lodash-es`).

### 4.2 `pnpm outdated` — Significantly Outdated Packages

| Package | Current | Latest | Delta | Impact |
|---------|---------|--------|-------|--------|
| `vite` | `7.3.1` | `8.0.11` | **Major** | Build tool; security fixes in 7.3.2+ |
| `@vitejs/plugin-react` | `5.2.0` | `6.0.1` | **Major** | React fast refresh |
| `typescript` | `5.9.3` | `6.0.3` | **Major** | Type system (TS 6 is very new; upgrading cautiously is fine) |
| `eslint` | `9.39.4` | `10.3.0` | **Major** | Linter |
| `jsdom` | `28.1.0` | `29.1.1` | **Major** | Test environment |
| `@commitlint/cli` | `20.5.0` | `21.0.0` | **Major** | Git hooks |
| `better-sqlite3` | `12.6.2` | `12.9.0` | Minor | Native SQLite driver |
| `lucide-react` | `0.577.0` | `1.14.0` | **Major** | Icon library |

**Recommendation:**
- [ ] **Priority:** Upgrade `vite` to `>=7.3.2` (or `^8.0.5`) to resolve the high-severity arbitrary file read and `fs.deny` bypass.
- [ ] **Priority:** Evaluate upgrading or replacing `react-big-calendar` to pull in a patched `lodash-es` (>=4.18.0).
- [ ] Plan major-version upgrades for Vite 8, React plugin 6, and ESLint 10 in a dedicated maintenance sprint.

---

## 5. Script Integrity Check

| Script in `package.json` | Command / File | Exists | Status |
|--------------------------|----------------|--------|--------|
| `dev` | `src-tauri/tauri.dev.conf.json` | ✅ Yes | Pass |
| `dev:server` | `src/index.ts` | ✅ Yes | Pass |
| `dev:web` | `../../node_modules/vite/bin/vite.js` | ✅ Yes | Pass |
| `inngest:serve` | `src/rag/inngest-serve.ts` | ✅ Yes | Pass |
| `build` | `tauri build` | CLI | Pass |
| `build:frontend` | `../../node_modules/vite/bin/vite.js build` | ✅ Yes | Pass |
| `cli` | `src/cli.ts` | ✅ Yes | Pass |
| `test:web` | `vitest.browser.config.ts` | ✅ Yes | Pass |
| `test:ipc-smoke` | `scripts/smoke-test-ipc.mjs` | ✅ Yes | Pass |
| `test:visual` | `e2e/visual.spec.ts` | ✅ Yes | Pass |
| `benchmark` | `scripts/performance-benchmark.js` | ✅ Yes | Pass |
| `memory-check` | `scripts/memory-leak-detector.js` | ✅ Yes | Pass |
| `test` | `vitest run` | CLI | Pass |
| `lint` | `eslint` | CLI | Pass |
| `typecheck` | `tsc --noEmit` | CLI | Pass |
| `format` | `prettier` | CLI | Pass |

**Result:** All referenced scripts and config files exist. **PASS**

---

## 6. Recommendations Summary

| Priority | Item | Owner / Notes |
|----------|------|---------------|
| 🔴 High | Expand `.env.example` with all env vars | Prevents onboarding friction and secret leaks |
| 🔴 High | Upgrade `vite` to `>=7.3.2` | Fixes high-severity dev-server vulnerabilities |
| 🔴 High | Resolve `lodash-es` via `react-big-calendar` upgrade | Fixes code injection vector |
| 🟡 Medium | Add PNG icon variants for macOS/Linux bundling | `icon.png`, `32x32.png`, `128x128.png`, `128x128@2x.png` |
| 🟡 Medium | Add `LICENSE.md` (MIT) | Satisfies bundler and distribution requirements |
| 🟡 Medium | Document `NOVA_MOBILE_LAN_ENABLED` security implications | Users should understand LAN-mode risks |
| 🟢 Low | Add comments in `tauri.conf.json` CSP for each localhost port | Maintainability |
| 🟢 Low | Evaluate removing `'unsafe-inline'` from `style-src` | Requires inline-style audit |
| 🟢 Low | Major-version dependency upgrade sprint | Vite 8, ESLint 10, TypeScript 6, etc. |

---

## 7. Overall Audit Scorecard

| Category | Result | Notes |
|----------|--------|-------|
| **Version Alignment** | ✅ **PASS** | All 6 files agree on `1.3.0` |
| **Security Config** | ⚠️ **WARNINGS** | Incomplete `.env.example`; broad CSP; LAN opt-in feature exists |
| **Bundle Assets** | ⚠️ **PARTIAL** | `icon.png` missing; `LICENSE` missing |
| **Dependency Audit** | ⚠️ **WARNINGS** | 2 direct high-severity findings; several workspace-level highs |
| **Script Integrity** | ✅ **PASS** | All referenced files and commands valid |
| **Report Created** | ✅ **YES** | This file |

**Bottom Line:** `apps/nova-agent` is consistent in version and script integrity, but has security hygiene gaps (incomplete `.env.example`, direct `lodash-es` vulnerability, missing bundler assets) that should be addressed before the next release.

---

*End of Report*
