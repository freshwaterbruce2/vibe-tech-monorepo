const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..', '..');
const config = getDefaultConfig(projectRoot);

// ─── ENOENT Resilience ────────────────────────────────────────────────────
// Metro's FallbackWatcher (used on Windows without watchman) calls fs.watch()
// on every directory it finds. TypeScript creates temporary directories like
//   nova-mobile-app/node_modules/@types/react_tmp_XXXX/ts5.0
// and @expo/devtools creates devtools_tmp_XXXX inside node_modules.
// These are created and deleted rapidly. If FallbackWatcher tries to
// fs.watch() a directory that was already deleted, it throws an unhandled
// ENOENT that crashes the entire Metro process.
//
// This handler intercepts those transient ENOENT errors and keeps Metro alive.
// The affected temp directory just won't be watched — which is fine, since
// they're throwaway directories not containing source files.
process.on('uncaughtException', (err) => {
  if (
    err.code === 'ENOENT' &&
    (err.path.includes('_tmp_') ||
      err.path.includes('devtools_tmp') ||
      err.path.includes('react_tmp'))
  ) {
    // Transient temp dir disappeared before we could watch it — safe to ignore
    return;
  }
  // Re-throw anything else so real bugs still crash Metro visibly
  throw err;
});
// ─────────────────────────────────────────────────────────────────────────

// ─── Monorepo Resolution ──────────────────────────────────────────────────
// pnpm hoists packages like react-native to C:\dev\node_modules (workspace root).
// Metro needs to know about BOTH the project-level and root-level node_modules.
// watchFolders: tells Metro's file watcher where to look for source changes.
// nodeModulesPaths: tells the resolver where to find installed packages.
// extraNodeModules: direct fallback map for packages that exist only at root.
config.watchFolders = [workspaceRoot, projectRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = false;

// Direct fallback: if Metro can't find a package locally, look in workspace root.
// This is the definitive fix for pnpm monorepos where react-native is hoisted
// to C:\dev\node_modules but has no symlink in the project's node_modules.
config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (target, name) => {
      // Check local first, then fall back to workspace root
      const localPath = path.resolve(projectRoot, 'node_modules', String(name));
      const rootPath = path.resolve(workspaceRoot, 'node_modules', String(name));
      const fs = require('fs');
      if (fs.existsSync(localPath)) return localPath;
      if (fs.existsSync(rootPath)) return rootPath;
      return localPath; // Let Metro produce a clear error if neither exists
    },
  },
);

// Block large directories that should never be bundled
config.resolver.blockList = [/.*[/\\]src-tauri[/\\]target[/\\].*/, /.*[/\\]\.git[/\\].*/];

// Watcher health check
config.watcher.healthCheck = {
  enabled: true,
  interval: 10000,
  timeout: 5000,
};

module.exports = config;
