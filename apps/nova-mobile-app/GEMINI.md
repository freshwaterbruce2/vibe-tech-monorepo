---
type: ai-entrypoint
scope: project
audience:
  - gemini
status: active-development
lastReviewed: 2026-02-15
---

# GEMINI.md — Nova Mobile App

## Project Type

React Native mobile client for the Nova Agent desktop AI assistant. Connects via HTTP bridge.

## Location

`C:\dev\apps\nova-mobile-app\`

## Tech Stack

- **Framework**: Expo 54 + React Native 0.83 + React 19
- **Language**: TypeScript (strict)
- **Navigation**: React Navigation 7 (bottom-tabs)
- **State**: Zustand 5
- **Icons**: lucide-react-native
- **Testing**: Vitest

## Key Commands

```bash
pnpm start             # Expo dev server
pnpm test              # Vitest unit tests
pnpm typecheck         # tsc --noEmit
```

## Architecture

```
nova-mobile-app/
├── App.tsx                          # Thin shell (StatusBar + Navigator)
├── src/
│   ├── config.ts                    # Platform-aware API URL + Vibe theme
│   ├── navigation/
│   │   └── AppNavigator.tsx         # Bottom tab navigator (4 tabs)
│   ├── screens/
│   │   ├── ChatScreen.tsx           # AI chat interface
│   │   ├── MemoryScreen.tsx         # Memory search
│   │   ├── StatusScreen.tsx         # Connection health
│   │   └── SettingsScreen.tsx       # Configuration
│   ├── stores/
│   │   ├── chatStore.ts             # Zustand chat state
│   │   └── connectionStore.ts       # Zustand connection state
│   ├── services/
│   │   └── HttpAgentAdapter.ts      # HTTP bridge to Nova Agent desktop
│   └── types/
│       └── nova-modules.d.ts        # Type stubs for @nova/* packages
```

## Critical Patterns

- **"One Brain, Two Bodies"**: Mobile app uses `HttpAgentAdapter` to call the Nova Agent desktop Express server over HTTP. No direct LLM access from mobile.
- **Platform-aware URLs**: Android emulator → `10.0.2.2:3000`, iOS sim → `localhost:3000`, physical devices → user-configured in Settings.
- **Bridge routes**: `/health`, `/chat`, `/status`, `/memories/search`, `/projects`

## Quality Checklist

- [ ] TypeScript compiles (`tsc --noEmit`)
- [ ] Vitest passes
- [ ] All 4 tabs render
- [ ] Chat sends/receives messages via bridge
- [ ] Settings can change server URL

## Canonical References

- AI notes: ../../AI.md
- Workspace rules: ../../docs/ai/WORKSPACE.md
