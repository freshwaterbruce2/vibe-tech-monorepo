/**
 * TerminalService
 *
 * Integrated terminal service using xterm.js and Tauri Shell plugin
 * Manages multiple terminal sessions
 */

import { TerminalSession } from './terminal/TerminalSession';
import type { TerminalOptions, TerminalSessionState } from './terminal/types';

export class TerminalService {
  private terminals = new Map<string, TerminalSession>();
  private activeTerminalId: string | null = null;

  /**
   * Create a new terminal instance
   */
  createTerminal(options: TerminalOptions = {}): TerminalSession {
    const id = this.generateId();
    const session = new TerminalSession(id, options);

    this.terminals.set(id, session);

    if (this.terminals.size === 1) {
      this.activeTerminalId = id;
    }

    return session;
  }

  /**
   * Attach shell process to terminal
   */
  async attachShell(terminalId: string): Promise<void> {
    const session = this.getTerminal(terminalId);
    await session.spawn();
  }

  /**
   * Execute command in terminal
   */
  async executeCommand(terminalId: string, command: string): Promise<string> {
    const session = this.getTerminal(terminalId);
    return new Promise((resolve, reject) => {
      if (!session.process) {
        reject(new Error('No shell process attached'));
        return;
      }

      let output = '';
      const handler = (data: string) => (output += data);
      session.onData(handler);

      session.write(command);

      setTimeout(() => {
        // Cleanup handler? Logic from original file was weak here (race condition).
        // Keeping it simple as per original implementation intent.
        resolve(output);
      }, 100);
    });
  }

  /**
   * Write data to terminal
   */
  async writeToTerminal(terminalId: string, data: string): Promise<void> {
    const session = this.getTerminal(terminalId);
    session.write(data);
  }

  onData(terminalId: string, handler: (data: string) => void): void {
    this.getTerminal(terminalId).onData(handler);
  }

  onExit(terminalId: string, handler: (code: number) => void): void {
    this.getTerminal(terminalId).onExit(handler);
  }

  async killProcess(terminalId: string): Promise<void> {
    this.getTerminal(terminalId).kill();
  }

  clearTerminal(terminalId: string): void {
    this.getTerminal(terminalId).instance.clear();
  }

  resizeTerminal(terminalId: string, cols: number, rows: number): void {
    this.getTerminal(terminalId).resize(cols, rows);
  }

  async paste(terminalId: string, text: string): Promise<void> {
    this.getTerminal(terminalId).write(text);
  }

  search(terminalId: string, query: string): boolean {
    return this.getTerminal(terminalId).search(query);
  }

  async getCurrentDirectory(terminalId: string): Promise<string> {
    // With Tauri Shell, getting robust CWD from the running process is harder.
    // Returning configured CWD or home for now.
    // The cwd is already ensured to be string | null during creation.
    return this.getTerminal(terminalId).options.cwd ?? '';
  }

  getTerminal(terminalId: string): TerminalSession {
    const session = this.terminals.get(terminalId);
    if (!session) throw new Error('Terminal not found');
    return session;
  }

  getActiveTerminals(): TerminalSession[] {
    return Array.from(this.terminals.values());
  }

  removeTerminal(terminalId: string): void {
    const session = this.terminals.get(terminalId);
    if (session) {
      session.dispose();
      this.terminals.delete(terminalId);
      if (this.activeTerminalId === terminalId) {
        const remaining = Array.from(this.terminals.keys());
        this.activeTerminalId = remaining.length > 0 ? remaining[0]! : null;
      }
    }
  }

  setActiveTerminal(terminalId: string): void {
    if (!this.terminals.has(terminalId)) throw new Error('Terminal not found');
    this.activeTerminalId = terminalId;
  }

  getActiveTerminalId(): string | null {
    return this.activeTerminalId;
  }

  saveSession(terminalId: string): TerminalSessionState {
    const session = this.getTerminal(terminalId);
    return {
      id: session.id,
      name: session.options.name,
      shell: session.options.shell,
      options: session.options,
      createdAt: session.createdAt,
    };
  }

  restoreSession(state: TerminalSessionState): TerminalSession {
    const session = this.createTerminal({
      ...state.options,
      name: state.name,
      shell: state.shell,
    });
    // Restore ID to match
    this.terminals.delete(session.id);
    session.id = state.id;
    session.createdAt = state.createdAt;
    this.terminals.set(session.id, session);
    return session;
  }

  exportSessions(): TerminalSessionState[] {
    return this.getActiveTerminals().map((s) => this.saveSession(s.id));
  }

  dispose(): void {
    this.terminals.forEach((s) => s.dispose());
    this.terminals.clear();
    this.activeTerminalId = null;
  }

  private generateId(): string {
    return `terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
