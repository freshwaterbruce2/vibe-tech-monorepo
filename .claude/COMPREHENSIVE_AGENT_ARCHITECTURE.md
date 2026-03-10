# Comprehensive Agent Architecture - All Categories

**Created:** 2026-01-16
**Updated:** 2026-01-18
**Status:** Phase 4 Complete
**Scope:** Complete multi-category agent system for VibeTech monorepo
**Reference:** [Anthropic Multi-Agent Research System](https://www.anthropic.com/engineering/multi-agent-research-system)

---

## Executive Summary

This document defines the complete agent and sub-agent architecture for the VibeTech monorepo, following the **orchestrator-worker pattern** proven by Anthropic's Research system. Each parent agent acts as an orchestrator that delegates to specialized sub-agents (workers) for focused task execution.

### Architecture Goals

1. **Category Isolation** - Each category has dedicated context and specialized sub-agents
2. **Comprehensive Coverage** - All 5 main categories receive proper sub-agent support
3. **Cross-Cutting Efficiency** - Database/API/QA specialists available to all categories
4. **Cost Optimization** - Strategic model selection (Haiku-4 vs Sonnet-4)
5. **Proven Patterns** - Based on Anthropic's orchestrator-worker architecture

### Key Insights from Anthropic Engineering

> _"Multi-agent systems with Claude Opus 4 as the lead agent and Claude Sonnet 4 subagents outperformed single-agent Claude Opus 4 by 90.2% on complex research tasks."_

- **Token scaling**: Multi-agent systems use ~15x more tokens than chat, but enable parallel exploration
- **Parallelization**: 3-5 concurrent subagents cuts task time by up to 90%
- **Clear delegation**: Each subagent needs objective, output format, tool guidance, task boundaries
- **Scale effort to complexity**: Simple (1 agent, 3-10 calls) → Complex (10+ subagents)

---

## Category Structure

### Main Categories (with Sub-Agents)

| Category             | Status      | Sub-Agents | Phase   |
| -------------------- | ----------- | ---------- | ------- |
| Desktop Applications | ✅ Complete | 5          | Phase 1 |
| Web Applications     | ✅ Complete | 5          | Phase 2 |
| Backend Services     | ✅ Complete | 5          | Phase 3 |
| Mobile Applications  | ✅ Complete | 4          | Phase 4 |
| Crypto Trading       | 📋 Planned  | 3          | Phase 5 |

### Cross-Cutting Specialists (Parent-Level Only)

- **database-expert** - Database design, optimization, migrations
- **api-expert** - RESTful API design, OpenAPI specs
- **data-expert** - Data modeling, analytics
- **qa-expert** - Testing strategies, quality assurance
- **ui-ux-expert** - Design systems, accessibility
- **learning-expert** - AI learning system integration

---

## Sub-Agent Distribution

Each category follows the **3-5 sub-agents** pattern per Anthropic's guidance:

```
Desktop Apps (5 sub-agents) ✅ Phase 1 Complete
├── desktop-quality-checker      [Haiku-4]  - Lint, typecheck, format
├── desktop-test-coordinator     [Sonnet-4] - Tests, coverage, e2e
├── desktop-cleanup-specialist   [Haiku-4]  - Build artifacts, cache
├── desktop-build-specialist     [Haiku-4]  - Electron/Tauri builds
└── desktop-integration-specialist [Sonnet-4] - IPC, preload, native

Web Apps (5 sub-agents) ✅ Phase 2 Complete
├── vite-build-specialist        [Haiku-4]  - Build optimization, HMR, chunks
├── react-component-specialist   [Haiku-4]  - Components, hooks, React 19
├── ui-integration-specialist    [Haiku-4]  - shadcn/ui, Tailwind, themes
├── web-testing-specialist       [Haiku-4]  - Vitest, Playwright, coverage
└── web-cleanup-specialist       [Haiku-4]  - Build artifacts, cache

Backend Services (5 sub-agents) ✅ Phase 3 Complete
├── api-implementation-specialist    [Haiku-4]  - REST/GraphQL, middleware
├── database-integration-specialist  [Sonnet-4] - ORMs, migrations, D:\ policy
├── backend-security-specialist      [Sonnet-4] - Auth, OWASP, validation
├── backend-deployment-specialist    [Haiku-4]  - Docker, PM2, health checks
└── backend-testing-specialist       [Haiku-4]  - Jest, Vitest, supertest

Mobile Apps (4 sub-agents) ✅ Phase 4 Complete
├── capacitor-build-specialist       [Sonnet-4] - Native builds, Capacitor 7+
├── pwa-specialist                   [Haiku-4]  - Service workers, offline, Workbox
├── mobile-ui-specialist             [Haiku-4]  - Touch, gestures, responsive
└── mobile-testing-specialist        [Haiku-4]  - Device testing, emulators

Crypto Trading (3 sub-agents) - Phase 5 Planned
├── trading-strategy-specialist      [Sonnet-4] - Algorithms, backtesting, risk
├── exchange-integration-specialist  [Sonnet-4] - Kraken API, WebSocket V2
└── crypto-testing-specialist        [Haiku-4]  - Trading simulation, safety
```

---

## Model Selection Strategy

Based on Anthropic's guidance and Phase 1-4 lessons:

### Haiku-4 (Claude Haiku 4) - Fast & Deterministic

**Use for:** Tasks with clear rules, repetitive patterns, deterministic outcomes

- Build operations (compile, bundle, deploy)
- File cleanup/organization
- Configuration validation
- Component pattern matching
- UI integration checks
- API endpoint implementation
- Testing execution
- Deployment tasks
- PWA configuration
- Mobile UI validation

### Sonnet-4 (Claude Sonnet 4) - Reasoning & Complex

**Use for:** Tasks requiring judgment, security analysis, architectural decisions

- Architecture decisions
- Integration strategies (IPC, native)
- Testing strategies (not execution)
- Security reviews (OWASP compliance)
- Complex debugging
- Database schema design
- Migration planning
- Native Capacitor integration

### Context Budget

- **Sub-agents:** 2k-5k tokens (focused, specific tasks)
- **Parent agents:** 15k-30k tokens (coordination, planning)
- **Orchestrator (user level):** Up to 100k tokens

---

## Implementation Status

### Phase 1: Desktop Apps ✅ Complete

- ✅ desktop-quality-checker
- ✅ desktop-test-coordinator
- ✅ desktop-cleanup-specialist
- ✅ desktop-build-specialist
- ✅ desktop-integration-specialist

### Phase 2: Web Apps ✅ Complete (2026-01-18)

- ✅ vite-build-specialist
- ✅ react-component-specialist
- ✅ ui-integration-specialist
- ✅ web-testing-specialist
- ✅ web-cleanup-specialist

### Phase 3: Backend Services ✅ Complete (2026-01-18)

- ✅ api-implementation-specialist
- ✅ database-integration-specialist (enforces D:\ storage policy)
- ✅ backend-security-specialist (OWASP Top 10 checklist)
- ✅ backend-deployment-specialist (PM2, Docker, health checks)
- ✅ backend-testing-specialist (Jest, Vitest, supertest)

### Phase 4: Mobile Apps ✅ Complete (2026-01-18)

- ✅ capacitor-build-specialist (Android/iOS, Capacitor 7+)
- ✅ pwa-specialist (Service workers, Workbox, offline-first)
- ✅ mobile-ui-specialist (Touch targets, gestures, safe areas)
- ✅ mobile-testing-specialist (Emulators, Maestro, BrowserStack)

### Phase 5: Crypto Trading (Next Priority)

- 📋 trading-strategy-specialist
- 📋 exchange-integration-specialist
- 📋 crypto-testing-specialist

---

## Mobile Sub-Agents (Phase 4 Detail)

### capacitor-build-specialist

**Model:** Sonnet-4 | **Context:** 4500 tokens | **Timeout:** 5min
**Triggers:** capacitor, android, ios, apk, gradle, xcode, native, plugin
**Patterns:**

- Capacitor 7+ configuration (capacitor.config.ts)
- Android: Gradle, versionCode auto-increment, ProGuard
- iOS: CocoaPods, Xcode schemes (macOS required)
- Native bridge: custom plugins, permissions, deep linking
- Safety: versionCode always incremented, keystore never in repo

### pwa-specialist

**Model:** Haiku-4 | **Context:** 3500 tokens | **Timeout:** 4min
**Triggers:** pwa, service worker, offline, manifest, workbox, background sync
**Patterns:**

- Manifest: icons, theme_color, display: standalone
- Service worker strategies: cache-first, network-first, stale-while-revalidate
- Workbox: runtimeCaching, precaching, navigationPreload
- Update strategies: auto-update vs prompt-update
- Lighthouse targets: PWA score 100, Performance 90+

### mobile-ui-specialist

**Model:** Haiku-4 | **Context:** 3500 tokens | **Timeout:** 3min
**Triggers:** touch, gesture, swipe, mobile ui, responsive, safe area, haptic
**Patterns:**

- Touch targets: 44x44px (Apple) / 48x48dp (Android)
- Gestures: swipe, pull-to-refresh, pinch-zoom, long-press
- Navigation: bottom nav, tab bar, back button handling
- Safe areas: notch, home indicator, rounded corners
- Performance: 60fps animations, passive event listeners

### mobile-testing-specialist

**Model:** Haiku-4 | **Context:** 3500 tokens | **Timeout:** 10min
**Triggers:** mobile test, device test, emulator, adb, appium, maestro
**Patterns:**

- Unit tests: mock @capacitor/\* plugins
- E2E: Detox, Maestro, Appium
- Android: adb commands, AVD emulator, network simulation
- iOS: Simulator (macOS), xcrun simctl
- Cloud: BrowserStack, Sauce Labs

---

## Safety Mechanisms (All Categories)

1. **Dry-Run Mode** - Preview changes before execution
2. **Confirmation Prompts** - User approval for destructive operations
3. **Incremental Verification** - Check each step before proceeding
4. **Rollback Support** - Undo capabilities where applicable
5. **Learning Integration** - Record mistakes to prevent repetition
6. **Sequential Requirements** - Security audit before deployment

### Sequential Execution Rules

```yaml
# Backend
- [api-implementation-specialist, backend-security-specialist]
- [database-integration-specialist, backend-testing-specialist]
- [backend-security-specialist, backend-deployment-specialist]

# Mobile
- [capacitor-build-specialist, mobile-testing-specialist]
- [pwa-specialist, mobile-testing-specialist]
```

---

## Delegation Triggers Summary

### Desktop Apps Agent → Sub-Agents

| Keywords                            | Sub-Agent                      |
| ----------------------------------- | ------------------------------ |
| lint, quality, typecheck, format    | desktop-quality-checker        |
| test, coverage, e2e, playwright     | desktop-test-coordinator       |
| clean, cleanup, disk space          | desktop-cleanup-specialist     |
| build, package, installer, exe      | desktop-build-specialist       |
| ipc, preload, native, contextBridge | desktop-integration-specialist |

### Web Apps Agent → Sub-Agents

| Keywords                           | Sub-Agent                  |
| ---------------------------------- | -------------------------- |
| vite, build error, bundle, hmr     | vite-build-specialist      |
| component, hook, useState, react   | react-component-specialist |
| shadcn, tailwind, styling, theme   | ui-integration-specialist  |
| test, vitest, playwright, coverage | web-testing-specialist     |
| clean, cleanup, cache clear        | web-cleanup-specialist     |

### Backend Agent → Sub-Agents

| Keywords                                 | Sub-Agent                       |
| ---------------------------------------- | ------------------------------- |
| api, endpoint, route, middleware, rest   | api-implementation-specialist   |
| database, migration, schema, orm, sqlite | database-integration-specialist |
| auth, security, jwt, owasp, validation   | backend-security-specialist     |
| deploy, pm2, docker, health check        | backend-deployment-specialist   |
| test, jest, supertest, coverage          | backend-testing-specialist      |

### Mobile Agent → Sub-Agents

| Keywords                               | Sub-Agent                  |
| -------------------------------------- | -------------------------- |
| capacitor, android, ios, apk, gradle   | capacitor-build-specialist |
| pwa, service worker, offline, manifest | pwa-specialist             |
| touch, gesture, mobile ui, responsive  | mobile-ui-specialist       |
| mobile test, emulator, adb, device     | mobile-testing-specialist  |

---

## Configuration Files

### Agents Configuration

- **Location:** `.claude/agents.json`
- **Purpose:** Map projects to parent agents
- **Status:** ✅ All categories mapped

### Sub-Agents Configuration

- **Location:** `.claude/sub-agents/config.yml`
- **Version:** 4.0 (Phase 4)
- **Purpose:** Define all sub-agents, models, contexts
- **Status:** ✅ Phase 1-4 complete, Phase 5 defined (disabled)

### Delegation Rules

- **Location:** `.claude/agent-delegation.yaml`
- **Version:** 3.0.0
- **Purpose:** High-level workflow, references config.yml for sub-agents

---

## Success Metrics

| Metric                   | Target         | Current              |
| ------------------------ | -------------- | -------------------- |
| Task Completion Time     | 30-50% faster  | Measuring            |
| Error Rate               | <5%            | Measuring            |
| Cost Efficiency          | 40-60% savings | ~45% (Haiku-4 usage) |
| API Cost Reduction       | 20%            | Target               |
| Execution Time Reduction | 40%            | Target               |
| PWA Lighthouse Score     | 100            | Target               |
| Mobile Build Success     | 95%            | Target               |

---

## Lessons Learned (Phase 1-4)

### From Anthropic's Multi-Agent Research

1. **Teach delegation clearly** - Subagents need objective, output format, tool guidance
2. **Scale effort to complexity** - Don't over-engineer simple tasks
3. **Tool selection is critical** - Match tools to user intent
4. **Let agents improve themselves** - Claude can diagnose and suggest improvements
5. **Start wide, then narrow** - Explore before drilling into specifics
6. **Parallel execution transforms speed** - 3-5 concurrent subagents

### VibeTech-Specific Learnings

1. **D:\ storage policy enforcement** - Database specialist must check paths
2. **Security before deployment** - Sequential rule prevents shipping vulnerabilities
3. **Haiku-4 handles most tasks** - Reserve Sonnet-4 for reasoning-heavy work
4. **Clear boundaries prevent duplication** - Well-defined triggers avoid conflicts
5. **versionCode always incremented** - Android caching requires cache-bust
6. **PWA requires HTTPS** - Service workers need secure context

---

## Next Steps

1. ✅ Create this architecture document
2. ✅ Implement Desktop sub-agents (Phase 1)
3. ✅ Implement Web Apps sub-agents (Phase 2)
4. ✅ Implement Backend sub-agents (Phase 3)
5. ✅ Implement Mobile Apps sub-agents (Phase 4)
6. 📋 Implement Crypto Trading sub-agents (Phase 5)
7. 📋 Validate and tune based on real usage metrics

---

## Related Documentation

- `.claude/FINISHER_METHODOLOGY.md` - Completion workflow
- `.claude/sub-agents/config.yml` - Sub-agent definitions (v4.0)
- `.claude/agents.json` - Parent agent mappings
- `.claude/agent-delegation.yaml` - High-level delegation rules
- Spec files: `.claude/sub-agents/*.md`

---

**Status:** Phase 4 Complete (19 sub-agents active)
**Owner:** Development Team
**Next Review:** 2026-02-01 (Phase 5 Crypto)
