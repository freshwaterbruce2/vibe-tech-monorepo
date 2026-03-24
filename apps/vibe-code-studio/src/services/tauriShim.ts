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
          const result = await shellMod.Command.create('exec-cmd', ['-c', command], { cwd }).execute();
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
          return { success: true, stats: { size: info.size, isFile: info.isFile, isDirectory: info.isDirectory, created: new Date(), modified: new Date() } };
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

    // --- Apex (Semantic Search — stubbed, not yet ported) ---
    apex: {
      async get(_key: string) { return undefined; },
      async set(_key: string, _value: string) { return { success: true }; },
      async delete(_key: string) { return { success: true }; },
      async initSemanticIndex(_path: string) { return { success: false, error: 'Not available in Tauri yet' }; },
      async updateSemanticIndex(_path: string, _files: string[]) { return { success: false }; },
      async semanticSearch(_query: string, _topK?: number) { return []; },
      async getStatus() { return { initialized: false, indexedFiles: 0 }; },
      async queryVector(_query: string, _maxResults?: number) { return []; },
      async indexWorkspace(_path: string) { return { success: false, error: 'Not available in Tauri yet' }; },
    },

    // --- ipcRenderer (legacy stub for db:savePattern etc.) ---
    ipcRenderer: {
      async invoke(channel: string, ...args: any[]) {
        const { invoke } = await import('@tauri-apps/api/core');
        // Route known channels to Tauri commands
        if (channel === 'db:savePattern') {
          const data = args[0] ?? {};
          return await invoke('db_save_pattern', { pattern: data.pattern ?? '', tags: data.tags });
        }
        if (channel === 'db:query') {
          return await invoke('db_execute_query', { sql: args[0], queryParams: args[1] });
        }
        console.warn(`[TauriShim] Unhandled ipcRenderer.invoke channel: ${channel}`);
        return null;
      },
      on(_channel: string, _listener: any) { /* no-op */ },
      removeListener(_channel: string, _listener: any) { /* no-op */ },
    },

    // --- Window (stubbed — Tauri handles these natively) ---
    window: {
      minimize() { /* handled by Tauri window decorations */ },
      maximize() { /* handled by Tauri window decorations */ },
      close() { /* handled by Tauri window decorations */ },
      async isMaximized() { return false; },
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
