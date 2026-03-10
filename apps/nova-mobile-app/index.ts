/* eslint-disable @typescript-eslint/no-require-imports */
// ─── CRITICAL: No static `import` statements in this file ───────────────────
// Babel hoists static imports to the top of the module body, which means
// react-native loads BEFORE our console patch runs. Using `require()` instead
// ensures the patch executes first.
//
// Root cause: Expo Go New Architecture (JSI/Hermes) seals console.error as
// non-writable. ExceptionsManager does `console.error = patchedFn` → throws
// "property is not writable" → corrupts React Native's init chain → blank screen.
// ────────────────────────────────────────────────────────────────────────────

// Step 1: Patch console BEFORE anything else loads
// Uses getter/setter accessors so that when ExceptionsManager or Hermes does
//   console.error = patchedFn
// it flows through the setter instead of hitting "property is not writable".
try {
  (['error', 'warn', 'log', 'info'] as const).forEach((m) => {
    let current = (console[m] as (...args: unknown[]) => void).bind(console);
    Object.defineProperty(console, m, {
      configurable: true,
      enumerable: true,
      get() {
        return current;
      },
      set(fn: (...args: unknown[]) => void) {
        current = fn;
      },
    });
  });
} catch {
  // Already patched or not supported — safe to ignore
}

// Step 2: Load react-native and expo AFTER the patch (not hoisted)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { LogBox } = require('react-native') as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const { registerRootComponent } = require('expo') as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const App = (require('./App') as any).default;

LogBox.ignoreLogs(['ExceptionsManager should be set up after React DevTools']);

registerRootComponent(App);
