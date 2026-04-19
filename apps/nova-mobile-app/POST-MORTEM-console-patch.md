# Post-Mortem — Hermes / New Architecture Console-Seal Blank Screen

**Date:** 2026-03 (pre-release beta)
**Severity:** P0 — app failed to launch in Expo Go on New Architecture runtimes
**Status:** Resolved. Fix is live in `index.ts`.
**Scope:** `apps/nova-mobile-app` only. Desktop `apps/nova-agent` was not affected.

## Summary

NOVA Mobile crashed to a blank screen immediately on launch under Expo Go with the New Architecture (Hermes + JSI). The React Native `ExceptionsManager` tried to monkey-patch `console.error`, the patch threw `TypeError: property is not writable`, the crash corrupted React Native's init chain, and `registerRootComponent` never reached our `App`.

## Impact

- Every Android device using Expo Go on SDK 54 with New Architecture enabled showed a blank dark screen after the splash.
- No visible error — the process stayed alive, so even LogBox was unreachable.
- Blocked all device testing for ~2 days.

## Timeline

| When | Event |
|------|-------|
| T0 | Upgraded to Expo SDK 54; enabled New Architecture. |
| T0 + 1h | First blank-screen report from Android device. Simulator unaffected initially. |
| T0 + 3h | Metro logs show `ExceptionsManager should be set up after React DevTools` and a downstream `TypeError` during module evaluation. |
| T0 + 6h | Narrowed to `console.error = ...` inside `ExceptionsManager`. Discovered Hermes seals built-in console methods as `writable: false`. |
| T0 + 1d | First fix attempt: reassign `console.error` in `App.tsx`. Too late — `react-native` had already imported ExceptionsManager. |
| T0 + 2d | Moved patch to entry (`index.ts`). Used `Object.defineProperty` with getter/setter so reassignment flows through a setter instead of hitting the sealed slot. Verified fix on emulator, Pixel 6, Galaxy S22. |

## Root Cause

Under Hermes + JSI, `console.error`, `console.warn`, `console.log`, and `console.info` are defined as non-writable properties. React Native's `ExceptionsManager` (loaded as a side-effect of `import from 'react-native'`) does a plain assignment `console.error = patchedFn`. That assignment silently fails in sloppy mode, throws in strict mode, and in Hermes' strict-by-default runtime it throws `property is not writable`. The throw happens during module evaluation, so the JS bundle never finishes initializing and `registerRootComponent` never runs.

Two things made this hard to spot:

1. **Babel hoisting.** Any ES `import` statement is hoisted to the top of the module. That meant patching `console` at the top of `index.ts` via `import` still landed *after* `react-native` had been resolved by the bundler. The patch had to pre-empt the import, which rules out static imports entirely.
2. **Silent failure.** The error surfaced as a blank screen, not a redbox, because ExceptionsManager itself is what wires up redboxes.

## Fix

`index.ts` replaces the four console methods with accessor properties *before* loading `react-native`:

```ts
(['error', 'warn', 'log', 'info'] as const).forEach((m) => {
  let current = (console[m] as (...args: unknown[]) => void).bind(console);
  Object.defineProperty(console, m, {
    configurable: true,
    enumerable: true,
    get() { return current; },
    set(fn: (...args: unknown[]) => void) { current = fn; },
  });
});

const { LogBox } = require('react-native') as any;
const { registerRootComponent } = require('expo') as any;
const App = (require('./App') as any).default;
```

Two important shape decisions:

- **`require()` instead of `import`.** Prevents Babel from hoisting the RN import above the patch.
- **Getter/setter accessor instead of `writable: true`.** When ExceptionsManager does `console.error = patchedFn`, the setter accepts it and stores it in the closure variable. Reads go through the getter. ExceptionsManager works normally, Hermes doesn't throw, redboxes come back.

## Verification

- Android emulator (Pixel 6 API 34) — app reaches home screen.
- Physical Pixel 6 via `adb reverse` — app reaches home screen.
- Physical Galaxy S22 via `adb reverse` — app reaches home screen.
- Crash boundary in `App.tsx` (ErrorBoundary) confirmed still renders on synthetic throw.
- `pnpm --filter nova-mobile-app test` — HttpAgentAdapter unit tests unaffected.

## Lessons

- **Entry-point order matters.** Anything that needs to run before React Native bootstraps must live in `index.ts` with `require()`, not `App.tsx` with `import`.
- **Hermes is strict by default.** Don't assume you can monkey-patch globals; check for `writable: false` on platform-frozen properties.
- **Blank screen means `ExceptionsManager` itself failed.** If the runtime is alive but nothing renders, suspect the error-reporting layer before the UI layer.

## Follow-ups

- [x] Document in `CLAUDE.md` that `index.ts` is the entry point and must not take static imports. (Already done.)
- [x] Add the fix comment block above the accessor setup so nobody "simplifies" it back to static imports. (Done in `index.ts`.)
- [ ] Monitor Expo SDK 55 / RN 0.82 release notes — if upstream fixes the ExceptionsManager assignment to use `Object.defineProperty`, this shim becomes redundant and can be removed.

## Ownership

Fix + post-mortem: Bruce Freshwater (solo).
