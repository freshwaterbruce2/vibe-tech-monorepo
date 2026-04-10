/**
 * Tauri Compatibility Shim
 *
 * When running inside Tauri, polyfills `window.electron` so that existing
 * consumer code (store, dialog, shell, app) works without modification.
 * This is a zero-change bridge: existing `window.electron.store.get(...)` calls
 * resolve to `@tauri-apps/plugin-store` under the hood.
 *
 * Call `installTauriShim()` once at app startup (main.tsx / App.tsx).
 */

let installed = false;

export async function installTauriShim(): Promise<void> {
  if (installed) return;
  if (typeof window === 'undefined') return;
  if (!('__TAURI_INTERNALS__' in window)) return;

  // Already has electron shim (e.g. Electron preload) — skip
  if ((window as any).electron?.isElectron) return;

  try {
    const [
      { load },
      dialogMod,
      shellMod,
      pathMod,
    ] = await Promise.all([
      import('@tauri-apps/plugin-store'),
      import('@tauri-apps/plugin-dialog'),
      import('@tauri-apps/plugin-shell'),
      import('@tauri-apps/api/path'),
    ]);

    // Lazy-load the store instance
    let _store: Awaited<ReturnType<typeof load>> | null = null;
    async function getStore() {
      if (!_store) _store = await load('store.json');
      return _store;
    }

  const homeDirectory = await pathMod.homeDir();
  const platformInfo = {
    os: navigator.platform.includes('Win') ? 'win32' : navigator.platform.includes('Mac') ? 'darwin' : 'linux',
    arch: 'x64',
    version: '1.0.0-tauri',
    homedir: homeDirectory,
    pathSeparator: navigator.platform.includes('Win') ? '\\' : '/',
  };

  const shim = {
    isElectron: true, // Must be true so existing Electron checks use the shim
    isTauri: true,
    platform: platformInfo,

    // --- Store ---
    store: {
      async get(key: string) {
        const s = await getStore();
        return (await s.get(key)) ?? undefined;
      },
      async set(key: string, value: string) {
        const s = await getStore();
        await s.set(key, value);
        await s.save();
        return { success: true };
      },
      async delete(key: string) {
        const s = await getStore();
        await s.delete(key);
        await s.save();
        return { success: true };
      },
    },

    // --- Dialog ---
    dialog: {
      async openFile(options: any = {}) {
        const result = await dialogMod.open({
          multiple: true,
          filters: options.filters,
          ...options,
        });
        if (result === null) return { success: true, canceled: true, filePaths: [] };
        const paths = Array.isArray(result) ? result : [result];
        return { success: true, canceled: false, filePaths: paths };
      },
      async openFolder(options: any = {}) {
        const result = await dialogMod.open({
          directory: true,
          multiple: false,
          ...options,
        });
        if (result === null) return { success: true, canceled: true, filePaths: [] };
        const paths = Array.isArray(result) ? result : [result];
        return { success: true, canceled: false, filePaths: paths };
      },
      async saveFile(options: any = {}) {
        const result = await dialogMod.save({
          filters: options.filters,
          ...options,
        });
        if (result === null) return { success: true, canceled: true };
        return { success: true, canceled: false, filePath: result };
      },
      async showMessage(options: any = {}) {
        const ok = await dialogMod.ask(options.message ?? '', {
          title: options.title ?? 'Vibe Code Studio',
          kind: options.type ?? 'info',
        });
        return { success: true, response: ok ? 0 : 1 };
      },
    },

    // --- Shell ---
    shell: {
      async execute(command: string, cwd?: string) {
        try {
          const result = await shellMod.Command.create('exec-cmd', ['/C', command], { cwd }).execute();
          return { success: true, stdout: result.stdout, stderr: result.stderr, code: result.code ?? 0 };
        } catch (err) {
          return { success: false, stdout: '', stderr: String(err), code: 1 };
        }
      },
      async openExternal(url: string) {
        try {
          await shellMod.open(url);
          return { success: true };
        } catch (err) {
          return { success: false, error: String(err) };
        }
      },
    },

    // --- App ---
    app: {
      async getPath(name: string) {
        try {
          let p: string;
          if (name === 'userData' || name === 'appData') p = await pathMod.appDataDir();
          else if (name === 'home') p = await pathMod.homeDir();
          else p = await pathMod.appDataDir();
          return { success: true, path: p };
        } catch (err) {
          return { success: false, error: String(err) };
        }
      },
      async getPlatform() {
        return {
          success: true,
          platform: platformInfo.os,
          arch: platformInfo.arch,
          version: platformInfo.version,
          electron: '0',
          node: '0',
        };
      },
      getVersion() { return '1.0.0-tauri'; },
      restart() {
        import('@tauri-apps/plugin-process').then(m => m.relaunch());
      },
    },

    // --- Database ---
    db: {
      async getPatterns() {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke('db_get_patterns');
      },
      async initialize() {
        return { success: true };
      },
      async execute(sql: string, params?: any[]) {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke('db_execute_query', { sql, queryParams: params });
      },
      async query(sql: string, params?: any[]) {
        const { invoke } = await import('@tauri-apps/api/core');
        return await invoke('db_execute_query', { sql, queryParams: params });
      },
      async close() { return { success: true }; },
    },

    // --- FS (already handled via ElectronService, but polyfill for legacy callers) ---
    fs: {
      async readFile(filePath: string) {
        try {
          const { readTextFile: read } = await import('@tauri-apps/plugin-fs');
          const content = await read(filePath);
          return { success: true, content };
        } catch (err) {
          return { success: false, error: String(err) };
        }
      },
      async writeFile(filePath: string, content: string) {
        try {
          const { writeTextFile: write } = await import('@tauri-apps/plugin-fs');
          await write(filePath, content);
          return { success: true };
        } catch (err) {
          return { success: false, error: String(err) };
        }
      },
      async readDir(dirPath: string) {
        try {
          const { readDir: rd } = await import('@tauri-apps/plugin-fs');
          const entries = await rd(dirPath);
          const items = entries.map(e => ({
            name: e.name,
            path: `${dirPath}/${e.name}`,
            isDirectory: e.isDirectory,
            isFile: e.isFile,
          }));
          return { success: true, items };
        } catch (err) {
          return { success: false, error: String(err) };
        }
      },
      async exists(targetPath: string) {
        try {
          const { exists: ex } = await import('@tauri-apps/plugin-fs');
          const result = await ex(targetPath);
          return { success: true, exists: result };
        } catch {
          return { success: true, exists: false };
        }
      },
      async stat(targetPath: string) {
        try {
          const { stat: st } = await import('@tauri-apps/plugin-fs');
          const info = await st(targetPath);
          return { success: true, stats: { size: info.size, isFile: info.isFile, isDirectory: info.isDirectory, created: info.birthtime ?? new Date(), modified: info.mtime ?? new Date() } };
        } catch (err) {
          return { success: false, error: String(err) };
        }
      },
      async createDir(dirPath: string) {
        try {
          const { mkdir: mk } = await import('@tauri-apps/plugin-fs');
          await mk(dirPath, { recursive: true });
          return { success: true };
        } catch (err) {
          return { success: false, error: String(err) };
        }
      },
      async remove(targetPath: string) {
        try {
          const { remove: rm } = await import('@tauri-apps/plugin-fs');
          await rm(targetPath);
          return { success: true };
        } catch (err) {
          return { success: false, error: String(err) };
        }
      },
      async rename(oldPath: string, newPath: string) {
        try {
          const { rename: rn } = await import('@tauri-apps/plugin-fs');
          await rn(oldPath, newPath);
          return { success: true };
        } catch (err) {
          return { success: false, error: String(err) };
        }
      },
    },

    // --- Apex (Semantic Search) ---
    // Semantic search is handled by the memory MCP server and RAG pipeline.
    // These stubs satisfy the window.electron.apex API contract; consumers
    // should migrate to the MCP-based semantic search for real results.
    apex: {
      async get(_key: string) { return undefined; },
      async set(_key: string, _value: string) { return { success: true }; },
      async delete(_key: string) { return { success: true }; },
      async initSemanticIndex(_path: string) {
        console.info('[TauriShim] apex.initSemanticIndex is a no-op — use MCP semantic search');
        return { success: false, error: 'Semantic search available via MCP memory server' };
      },
      async updateSemanticIndex(_path: string, _files: string[]) {
        return { success: false };
      },
      async semanticSearch(_query: string, _topK?: number) { return []; },
      async getStatus() { return { initialized: false, indexedFiles: 0 }; },
      async queryVector(_query: string, _maxResults?: number) { return []; },
      async indexWorkspace(_path: string) {
        return { success: false, error: 'Semantic search available via MCP memory server' };
      },
    },

    // --- ipcRenderer (legacy Electron IPC bridge) ---
    // Routes known IPC channels to their Tauri command equivalents.
    // Unknown channels log a warning and return null gracefully.
    ipcRenderer: {
      async invoke(channel: string, ...args: any[]) {
        const { invoke } = await import('@tauri-apps/api/core');
        switch (channel) {
          case 'db:savePattern': {
            const data = args[0] ?? {};
            return await invoke('db_save_pattern', { pattern: data.pattern ?? '', tags: data.tags });
          }
          case 'db:query':
            return await invoke('db_execute_query', { sql: args[0], queryParams: args[1] });
          case 'db:getPatterns':
            return await invoke('db_get_patterns', { limit: args[0] ?? 100 });
          default:
            console.warn(`[TauriShim] Unhandled ipcRenderer.invoke channel: ${channel}`);
            return null;
        }
      },
      on(_channel: string, _listener: any) { /* no-op — Tauri uses event system */ },
      removeListener(_channel: string, _listener: any) { /* no-op */ },
    },

    // --- Window (delegates to Tauri window API) ---
    window: {
      async minimize() {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          await getCurrentWindow().minimize();
        } catch {
          // Fallback: native decorations handle this
        }
      },
      async maximize() {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          const win = getCurrentWindow();
          if (await win.isMaximized()) {
            await win.unmaximize();
          } else {
            await win.maximize();
          }
        } catch {
          // Fallback: native decorations handle this
        }
      },
      async close() {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          await getCurrentWindow().close();
        } catch {
          // Fallback: native decorations handle this
        }
      },
      async isMaximized() {
        try {
          const { getCurrentWindow } = await import('@tauri-apps/api/window');
          return await getCurrentWindow().isMaximized();
        } catch {
          return false;
        }
      },
    },
  };

  (shim as any).ipc = {
    send(_channel: string, _data?: any) { /* no-op */ },
    invoke: shim.ipcRenderer.invoke,
    on(_channel: string, _listener: any) {
      return () => {};
    },
    removeAllListeners(_channel: string) { /* no-op */ },
  };

  (window as any).electron = shim;
  installed = true;
  } catch (err) {
    console.error('[TauriShim] Failed to initialize — app will render without shim:', err);
  }
}
