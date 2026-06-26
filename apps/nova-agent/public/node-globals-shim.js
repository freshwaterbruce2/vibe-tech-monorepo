// Browser shim for the Node `process` global.
//
// Some workspace packages get pulled into the frontend bundle transitively via
// barrel files (e.g. `@vibetech/core` re-exports `DatabaseManager`, which imports
// `@vibetech/db-app` -> `@vibetech/shared-config`). Those modules touch the Node
// `process` global at module-evaluation time (e.g. `process.cwd()` for dotenv,
// `process.env` for env validation). In the Tauri webview there is no `process`,
// so evaluation throws "process is not defined" BEFORE React mounts, leaving the
// window blank. This dead code is never actually called in the webview — it just
// needs `process` to exist so module evaluation can complete.
//
// Loaded as a classic (non-module) script from index.html so it runs before the
// deferred ESM entry. Served same-origin, so it satisfies `script-src 'self'`.
(function () {
  if (typeof globalThis.process === 'undefined') {
    globalThis.process = {
      env: {},
      argv: [],
      platform: 'win32',
      versions: {},
      cwd: function () {
        return '/';
      },
      stderr: { write: function () {} },
      stdout: { write: function () {} },
    };
  }
})();
