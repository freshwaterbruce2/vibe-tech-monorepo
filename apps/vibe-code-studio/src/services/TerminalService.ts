/**
 * Terminal Service - Manages terminal sessions and command execution
 * Supports both Electron (child_process) and Tauri (portable-pty) backends.
 */

// Type-only import to avoid bundling Node.js modules in browser
import type { ChildProcess } from 'child_process';

export interface TerminalSession {
  id: string;
  process: ChildProcess | null;
  cwd: string;
  shell: string;
  createdAt: Date;
  /** Tauri event unlisteners for cleanup */
  tauriUnlisteners?: Array<() => void>;
}

type RuntimeProcessLike = {
  cwd?: () => string;
  env?: Record<string, string | undefined>;
  platform?: string;
};

export class TerminalService {
  private sessions: Map<string, TerminalSession> = new Map();
  private isElectron: boolean;
  private _isTauri: boolean;

  constructor() {
    type ElectronWindow = Window & { electron?: unknown; __TAURI_INTERNALS__?: unknown };
    this.isElectron = typeof window !== 'undefined' &&
      (window as ElectronWindow).electron !== undefined;
    this._isTauri = typeof window !== 'undefined' &&
      (window as ElectronWindow).__TAURI_INTERNALS__ !== undefined;
  }

  /**
   * Create a new terminal session
   */
  createSession(cwd?: string): string {
    const id = `terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const resolvedCwd = cwd ?? this.getCurrentWorkingDirectory();
    const shell = this.getDefaultShell();

    const session: TerminalSession = {
      id,
      process: null,
      cwd: resolvedCwd,
      shell,
      createdAt: new Date(),
    };

    this.sessions.set(id, session);
    return id;
  }

  /**
   * Start a shell process for the session
   */
  async startShell(
    sessionId: string,
    onData: (data: string) => void,
    onExit: (code: number | null) => void
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // --- Tauri path: use Rust PTY commands ---
    if (this._isTauri) {
      return this.startShellTauri(session, onData, onExit);
    }

    // --- Electron path: use child_process ---
    if (!this.isElectron) {
      // In browser mode, simulate a basic terminal
      onData('$ Web terminal mode - limited functionality\r\n');
      onData('$ Type "help" for available commands\r\n');
      return;
    }

    let spawn: typeof import('child_process').spawn;
    try {
      // Dynamic import of child_process only when in Electron
      ({ spawn } = await import('child_process'));
    } catch {
      // Renderer process in packaged Electron has no Node globals.
      // Fall back to non-interactive simulation instead of crashing.
      onData('$ Terminal unavailable in this runtime context\r\n');
      onData('$ Use command execution via main-process IPC instead\r\n');
      onExit(0);
      return;
    }

    // Spawn shell process
    const shellProcess = spawn(session.shell, [], {
      cwd: session.cwd,
      env: this.getProcessEnv(),
      shell: true,
    });

    session.process = shellProcess;

    // Handle stdout
    shellProcess.stdout?.on('data', (data: Buffer) => {
      onData(data.toString('utf8'));
    });

    // Handle stderr
    shellProcess.stderr?.on('data', (data: Buffer) => {
      onData(data.toString('utf8'));
    });

    // Handle exit
    shellProcess.on('exit', (code) => {
      onExit(code);
    });

    // Handle errors
    shellProcess.on('error', (err) => {
      onData(`\r\nError: ${err.message}\r\n`);
    });
  }

  /**
   * Start shell via Tauri invoke + event listeners
   */
  private async startShellTauri(
    session: TerminalSession,
    onData: (data: string) => void,
    onExit: (code: number | null) => void
  ): Promise<void> {
    const { invoke } = await import('@tauri-apps/api/core');
    const { listen } = await import('@tauri-apps/api/event');

    const unlisteners: Array<() => void> = [];

    // Listen for data events
    const unlistenData = await listen<{ id: string; data: string }>(
      'terminal:data',
      (event) => {
        if (event.payload.id === session.id) {
          onData(event.payload.data);
        }
      }
    );
    unlisteners.push(unlistenData);

    // Listen for exit events
    const unlistenExit = await listen<{ id: string; exit_code: number | null }>(
      'terminal:exit',
      (event) => {
        if (event.payload.id === session.id) {
          onExit(event.payload.exit_code);
        }
      }
    );
    unlisteners.push(unlistenExit);

    session.tauriUnlisteners = unlisteners;

    // Determine shell + args
    const platform = this.getPlatform();
    const shell = platform === 'win32' ? 'powershell.exe' : (this.getProcessEnv()['SHELL'] || '/bin/bash');
    const args = platform === 'win32' ? ['-NoLogo', '-NoProfile'] : [];

    // Build env
    const env: Record<string, string> = {
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
    };

    // Spawn via Rust command
    try {
      await invoke('pty_spawn', {
        id: session.id,
        shell,
        args,
        cols: 120,
        rows: 30,
        cwd: session.cwd,
        env,
      });
    } catch (err) {
      onData(`\r\nError spawning terminal: ${err}\r\n`);
      onExit(1);
    }
  }

  /**
   * Write input to terminal
   */
  writeInput(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (this._isTauri) {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke('pty_write', { id: sessionId, data }).catch(() => {});
      });
      return;
    }

    if (!session.process) return;
    session.process.stdin?.write(data);
  }

  /**
   * Resize terminal
   */
  resize(sessionId: string, cols: number, rows: number): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (this._isTauri) {
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke('pty_resize', { id: sessionId, cols, rows }).catch(() => {});
      });
      return;
    }

    if (!session.process) return;

    // Send resize signal if supported
    if (session.process.stdout && 'resize' in session.process.stdout) {
      (session.process.stdout as unknown as { resize: (opts: { columns: number; rows: number }) => void }).resize({ columns: cols, rows });
    }
  }

  /**
   * Close a terminal session
   */
  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (this._isTauri) {
      // Clean up Tauri event listeners
      session.tauriUnlisteners?.forEach(fn => fn());
      import('@tauri-apps/api/core').then(({ invoke }) => {
        invoke('pty_dispose', { id: sessionId }).catch(() => {});
      });
    } else if (session.process) {
      session.process.kill();
    }

    this.sessions.delete(sessionId);
  }

  /**
   * Get all active sessions
   */
  getSessions(): TerminalSession[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Get default shell for the platform
   */
  private getDefaultShell(): string {
    const platform = this.getPlatform();
    const env = this.getProcessEnv();
    if (platform === 'win32') {
      return (env['COMSPEC'] ?? 'cmd.exe') as string;
    } else {
      return (env['SHELL'] ?? '/bin/bash') as string;
    }
  }

  /**
   * Execute a single command (non-interactive)
   */
  async executeCommand(
    command: string,
    cwd?: string
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    if (this._isTauri) {
      // Use tauri-plugin-shell for one-shot commands
      try {
        const { Command } = await import('@tauri-apps/plugin-shell');
        const result = await Command.create('exec-cmd', ['-c', command], {
          cwd: cwd ?? this.getCurrentWorkingDirectory(),
        }).execute();
        return {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.code ?? 0,
        };
      } catch (err) {
        return {
          stdout: '',
          stderr: `Tauri command execution failed: ${err}`,
          exitCode: 1,
        };
      }
    }

    if (!this.isElectron) {
      // Browser mode - simulate response
      return {
        stdout: `Simulated output for: ${command}`,
        stderr: '',
        exitCode: 0,
      };
    }

    let spawn: typeof import('child_process').spawn;
    try {
      // Dynamic import of child_process only when in Electron
      ({ spawn } = await import('child_process'));
    } catch (error) {
      return {
        stdout: '',
        stderr: `Terminal execution unavailable in renderer context: ${(error as Error).message}`,
        exitCode: 1,
      };
    }

    return new Promise((resolve, reject) => {
      const shell = this.getDefaultShell();
      const proc = spawn(shell, ['-c', command], {
        cwd: cwd ?? this.getCurrentWorkingDirectory(),
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('exit', (code) => {
        resolve({
          stdout,
          stderr,
          exitCode: code ?? 0,
        });
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });
  }

  private getRuntimeProcess(): RuntimeProcessLike | undefined {
    const maybeProcess = (globalThis as { process?: RuntimeProcessLike }).process;
    if (maybeProcess && typeof maybeProcess === 'object') {
      return maybeProcess;
    }
    return undefined;
  }

  private getProcessEnv(): Record<string, string | undefined> {
    const runtimeProcess = this.getRuntimeProcess();
    if (runtimeProcess?.env) {
      return { ...runtimeProcess.env };
    }
    return {};
  }

  private getPlatform(): string {
    const runtimeProcess = this.getRuntimeProcess();
    if (runtimeProcess?.platform) {
      return runtimeProcess.platform;
    }

    if (typeof window !== 'undefined') {
      const electronWindow = window as unknown as {
        electron?: { platform?: { os?: string } };
      };
      const os = electronWindow.electron?.platform?.os;
      if (typeof os === 'string' && os.length > 0) {
        return os;
      }
    }

    return 'win32';
  }

  private getCurrentWorkingDirectory(): string {
    const runtimeProcess = this.getRuntimeProcess();
    if (runtimeProcess?.cwd && typeof runtimeProcess.cwd === 'function') {
      try {
        return runtimeProcess.cwd();
      } catch {
        // Ignore and use fallback below
      }
    }

    if (typeof window !== 'undefined') {
      const electronWindow = window as unknown as {
        electron?: { platform?: { homedir?: string } };
      };
      const homedir = electronWindow.electron?.platform?.homedir;
      if (typeof homedir === 'string' && homedir.length > 0) {
        return homedir;
      }
    }

    return '/';
  }
}

// Singleton instance
export const terminalService = new TerminalService();
