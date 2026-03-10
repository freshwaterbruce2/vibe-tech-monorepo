/**
 * Desktop Automation - Full desktop access and control
 * Mouse, keyboard, window management, screenshots, clipboard, process control
 */

import {
    Button,
    Key,
    Point,
    keyboard,
    mouse,
    getActiveWindow as nutGetActiveWindow,
    screen,
    straightTo
} from '@nut-tree-fork/nut-js';
import { Notification } from 'electron';
import { exec, spawn } from 'child_process';
import clipboard from 'clipboardy';
import * as fs from 'fs';
import screenshot from 'screenshot-desktop';
import * as si from 'systeminformation';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class DesktopAutomation {
  constructor() {
    // Nut.js configuration
    mouse.config.autoDelayMs = 50;
    keyboard.config.autoDelayMs = 50;
    // Speed up mouse movement
    mouse.config.mouseSpeed = 1000;
  }

  // ==================== MOUSE CONTROL ====================

  /**
   * Move mouse to absolute position
   */
  async moveMouse(x: number, y: number): Promise<void> {
    await mouse.move(straightTo(new Point(x, y)));
    console.log(`[Desktop] Mouse moved to (${x}, ${y})`);
  }

  /**
   * Get current mouse position
   */
  async getMousePosition(): Promise<{ x: number; y: number }> {
    const pos = await mouse.getPosition();
    return { x: pos.x, y: pos.y };
  }

  /**
   * Click mouse button
   */
  async mouseClick(button: 'left' | 'right' | 'middle' = 'left', double = false): Promise<void> {
    const btn =
      button === 'left'
        ? Button.LEFT
        : button === 'right'
        ? Button.RIGHT
        : Button.MIDDLE;

    if (double) {
      await mouse.doubleClick(btn);
    } else {
      await mouse.click(btn);
    }
    console.log(`[Desktop] ${double ? 'Double' : 'Single'} ${button} click`);
  }

  /**
   * Drag mouse to position
   */
  async dragMouse(x: number, y: number): Promise<void> {
    await mouse.drag(straightTo(new Point(x, y)));
    console.log(`[Desktop] Dragged mouse to (${x}, ${y})`);
  }

  /**
   * Scroll mouse wheel
   * Nut.js scroll is vertical/horizontal. Mapping x/y to up/down/left/right roughly.
   */
  async scrollMouse(x: number, y: number): Promise<void> {
    if (y !== 0) {
      await mouse.scrollDown(y); // Negative y would be scrollUp if we handled raw deltas, but simplified here
    }
    if (x !== 0) {
      // Horizontal scroll not always supported by all OS providers, but trying best effort
      await mouse.scrollLeft(x);
    }
    console.log(`[Desktop] Scrolled mouse: (${x}, ${y})`);
  }

  /**
   * Mouse down (press and hold)
   */
  async mouseToggle(down: boolean, button: 'left' | 'right' | 'middle' = 'left'): Promise<void> {
    const btn =
      button === 'left'
        ? Button.LEFT
        : button === 'right'
        ? Button.RIGHT
        : Button.MIDDLE;

    if (down) {
      await mouse.pressButton(btn);
    } else {
      await mouse.releaseButton(btn);
    }
  }

  // ==================== KEYBOARD CONTROL ====================

  /**
   * Type text
   */
  async typeText(text: string): Promise<void> {
    await keyboard.type(text);
    console.log(`[Desktop] Typed text: ${text.substring(0, 50)}...`);
  }

  /**
   * Press single key
   * Mapping generic string keys to Nut.js Key enum is complex.
   * Basic implementation for common strings, falling back to type for others.
   */
  async pressKey(keyStr: string, modifiers: string[] = []): Promise<void> {
    // This is a simplified mapping. Real-world usage requires a proper robust mapper.
    // Ideally we update the caller to pass Key enums or standard names.
    const k = this.mapKey(keyStr);
    const mods = modifiers.map(m => this.mapKey(m));

    if (k) {
        if (mods.length > 0) {
            await keyboard.pressKey(...mods as Key[]);
            await keyboard.pressKey(k);
            await keyboard.releaseKey(k);
            await keyboard.releaseKey(...mods.reverse() as Key[]);
        } else {
            await keyboard.pressKey(k);
            await keyboard.releaseKey(k);
        }
        console.log(`[Desktop] Pressed key: ${modifiers.join('+')}+${keyStr}`);
    } else {
        console.warn(`[Desktop] Unknown key mapping for: ${keyStr}`);
    }
  }

  private mapKey(key: string): Key | null {
      // Limited mapping for common keys used in shortcuts.
      const map: Record<string, Key> = {
          'control': Key.LeftControl,
          'alt': Key.LeftAlt,
          'shift': Key.LeftShift,
          'command': Key.LeftSuper,
          'win': Key.LeftSuper,
          'enter': Key.Enter,
          'escape': Key.Escape,
          'tab': Key.Tab,
          'backspace': Key.Backspace,
          'up': Key.Up,
          'down': Key.Down,
          'left': Key.Left,
          'right': Key.Right,
          'home': Key.Home,
          'end': Key.End,
          'pageup': Key.PageUp,
          'pagedown': Key.PageDown,
          'delete': Key.Delete,
          'space': Key.Space,
          'f5': Key.F5,
          'a': Key.A, 'b': Key.B, 'c': Key.C, 'd': Key.D, 'e': Key.E, 'f': Key.F,
          'g': Key.G, 'h': Key.H, 'i': Key.I, 'j': Key.J, 'k': Key.K, 'l': Key.L,
          'm': Key.M, 'n': Key.N, 'o': Key.O, 'p': Key.P, 'q': Key.Q, 'r': Key.R,
          's': Key.S, 't': Key.T, 'u': Key.U, 'v': Key.V, 'w': Key.W, 'x': Key.X,
          'y': Key.Y, 'z': Key.Z,
          '0': Key.Num0, '1': Key.Num1, '2': Key.Num2, '3': Key.Num3, '4': Key.Num4,
          '5': Key.Num5, '6': Key.Num6, '7': Key.Num7, '8': Key.Num8, '9': Key.Num9,
      };
      return map[key.toLowerCase()] ?? null;
  }

  /**
   * Hold key down
   */
  async keyDown(keyStr: string): Promise<void> {
    const k = this.mapKey(keyStr);
    if (k) await keyboard.pressKey(k);
  }

  /**
   * Release key
   */
  async keyUp(keyStr: string): Promise<void> {
    const k = this.mapKey(keyStr);
    if (k) await keyboard.releaseKey(k);
  }

  /**
   * Press keyboard shortcut
   */
  async pressShortcut(keys: string[]): Promise<void> {
      // Assuming last is the key, rest are modifiers
      if (keys.length === 0) return;
      const mainKey = keys[keys.length - 1]!; // Assert defined
      const modifiers = keys.slice(0, -1);
      await this.pressKey(mainKey, modifiers);
  }

  /**
   * Common shortcuts
   */
  shortcuts = {
    copy: async () => this.pressShortcut(['control', 'c']),
    paste: async () => this.pressShortcut(['control', 'v']),
    cut: async () => this.pressShortcut(['control', 'x']),
    selectAll: async () => this.pressShortcut(['control', 'a']),
    undo: async () => this.pressShortcut(['control', 'z']),
    redo: async () => this.pressShortcut(['control', 'y']),
    save: async () => this.pressShortcut(['control', 's']),
    find: async () => this.pressShortcut(['control', 'f']),
    newTab: async () => this.pressShortcut(['control', 't']),
    closeTab: async () => this.pressShortcut(['control', 'w']),
    refresh: async () => this.pressKey('f5'),
    altTab: async () => this.pressShortcut(['alt', 'tab']),
    windows: async () => this.pressKey('command'), // Windows key
  };

  // ==================== SCREEN CAPTURE ====================

  /**
   * Take full screenshot
   */
  async takeScreenshot(filepath: string): Promise<void> {
    const img = await screenshot({ format: 'png' });
    fs.writeFileSync(filepath, img);
    console.log(`[Desktop] Screenshot saved: ${filepath}`);
  }

  /**
   * Take screenshot of specific display
   */
  async takeScreenshotDisplay(displayId: number, filepath: string): Promise<void> {
    const img = await screenshot({ screen: displayId, format: 'png' });
    fs.writeFileSync(filepath, img);
    console.log(`[Desktop] Screenshot of display ${displayId} saved: ${filepath}`);
  }

  /**
   * Get pixel color at position
   */
  async getPixelColor(x: number, y: number): Promise<string> {
    // Nut.js screen.colorAt returns RGBA object or similar
    const color = await screen.colorAt(new Point(x, y));
    // Convert generic color to hex
    return color.toString();
  }

  /**
   * Get screen size
   */
  async getScreenSize(): Promise<{ width: number; height: number }> {
     const width = await screen.width();
     const height = await screen.height();
     return { width, height };
  }

  // ==================== CLIPBOARD ====================

  /**
   * Read clipboard text
   */
  async getClipboard(): Promise<string> {
    return await clipboard.read();
  }

  /**
   * Write to clipboard
   */
  async setClipboard(text: string): Promise<void> {
    await clipboard.write(text);
    console.log('[Desktop] Clipboard updated');
  }

  // ==================== WINDOW MANAGEMENT ====================

  /**
   * Get all open windows
   * Note: Nut.js might have limited 'list all windows' capability compared to node-window-manager depending on OS.
   * Using fallback/stub if not fully available in basic Nut.js without extra plugins.
   * IMPORTANT: Nut.js activeWindow() works, but getting ALL windows often requires platform specific plugins.
   * We will check if `getActiveWindow` is sufficient for now, or mock the list.
   *
   * Update: Nut.js v3+ has improved window support.
   */
  async getWindows(): Promise<Array<{
    id: number;
    title: string;
    processName: string;
    bounds: { x: number; y: number; width: number; height: number };
  }>> {
    // Nut.js doesn't natively expose "list all windows" in the core API easily cross-platform
    // without iterating
        // For now, we'll return the ACTIVE window as the only item to avoid breaking runtime,
        // or log a warning that full list is not supported yet in migration.
        try {
            const active = await nutGetActiveWindow(); // Changed from getActiveWindow()
            const title = await active.title;
        const region = await active.region;

        // Nut.js doesn't expose ID/ProcessName easily in a standardized way on all platforms in same object
        return [{
            id: 1, // Mock ID
            title: title,
            processName: 'unknown',
            bounds: {
                x: region.left,
                y: region.top,
                width: region.width,
                height: region.height
            }
        }];
    } catch (e) {
        console.warn("[DesktopAutomation] Failed to get active window via Nut.js", e);
        return [];
    }
  }

  /**
   * Get active window
   */
  async getActiveWindow(): Promise<any> {
    const win = await nutGetActiveWindow();
    const title = await win.title;
    const region = await win.region;
    return {
        title,
        bounds: { x: region.left, y: region.top, width: region.width, height: region.height }
    };
  }

  /**
   * Focus window by ID
   */
  async focusWindow(_windowId: number): Promise<void> {
      // Not fully supported by Nut.js core without precise handle
      console.warn("[DesktopAutomation] focusWindow by ID not fully supported in Nut.js migration yet.");
  }

  /**
   * Minimize window
   */
  async minimizeWindow(_windowId: number): Promise<void> {
      // Not fully supported
      console.warn("[DesktopAutomation] minimizeWindow by ID not fully supported in Nut.js migration yet.");
  }

  /**
   * Maximize window
   */
  async maximizeWindow(_windowId: number): Promise<void> {
     // Not fully supported
     console.warn("[DesktopAutomation] maximizeWindow by ID not fully supported in Nut.js migration yet.");
  }

  /**
   * Close window
   */
  async closeWindow(_windowId: number): Promise<void> {
      console.warn("[DesktopAutomation] closeWindow by ID not fully supported in Nut.js migration yet.");
  }

  /**
   * Move and resize window
   */
  async setWindowBounds(
    _windowId: number,
    _x: number,
    _y: number,
    _width: number,
    _height: number
  ): Promise<void> {
      // If we assume the windowId passed is the Active one (as we only return that), we can try moving active.
      // But safest is to warn for now.
      console.warn("[DesktopAutomation] setWindowBounds by ID not fully supported.");
  }

  // ==================== PROCESS MANAGEMENT ====================

  /**
   * Get running processes
   */
  async getProcesses(): Promise<any[]> {
    const processes = await si.processes();
    return processes.list;
  }

  /**
   * Launch application
   */
  async launchApp(appPath: string, args: string[] = []): Promise<number> {
    return new Promise((resolve, reject) => {
      const child = spawn(appPath, args, {
        detached: true,
        stdio: 'ignore',
      });

      child.unref();

      child.on('error', reject);
      child.on('spawn', () => {
        console.log(`[Desktop] Launched app: ${appPath}`);
        resolve(child.pid!);
      });
    });
  }

  /**
   * Kill process by PID
   */
  async killProcess(pid: number): Promise<void> {
    if (process.platform === 'win32') {
      await execAsync(`taskkill /PID ${pid} /F`);
    } else {
      await execAsync(`kill -9 ${pid}`);
    }
    console.log(`[Desktop] Killed process: ${pid}`);
  }

  /**
   * Kill process by name
   */
  async killProcessByName(name: string): Promise<void> {
    if (process.platform === 'win32') {
      await execAsync(`taskkill /IM ${name} /F`);
    } else {
      await execAsync(`pkill -9 ${name}`);
    }
    console.log(`[Desktop] Killed process: ${name}`);
  }

  // ==================== SYSTEM INFORMATION ====================

  /**
   * Get system info
   */
  async getSystemInfo(): Promise<any> {
    return {
      cpu: await si.cpu(),
      memory: await si.mem(),
      os: await si.osInfo(),
      graphics: await si.graphics(),
      battery: await si.battery(),
      network: await si.networkInterfaces(),
    };
  }

  /**
   * Get CPU usage
   */
  async getCpuUsage(): Promise<number> {
    const load = await si.currentLoad();
    return load.currentLoad;
  }

  /**
   * Get memory usage
   */
  async getMemoryUsage(): Promise<{ used: number; total: number; percentage: number }> {
    const mem = await si.mem();
    return {
      used: mem.used,
      total: mem.total,
      percentage: (mem.used / mem.total) * 100,
    };
  }

  /**
   * Get disk usage
   */
  async getDiskUsage(): Promise<any[]> {
    const disks = await si.fsSize();
    return disks.map((disk) => ({
      fs: disk.fs,
      type: disk.type,
      size: disk.size,
      used: disk.used,
      available: disk.available,
      percentage: disk.use,
      mount: disk.mount,
    }));
  }

  /**
   * Get network stats
   */
  async getNetworkStats(): Promise<any> {
    return await si.networkStats();
  }

  // ==================== FILE SYSTEM ====================

  /**
   * Read file
   */
  async readFile(filepath: string): Promise<string> {
    return fs.readFileSync(filepath, 'utf-8');
  }

  /**
   * Write file
   */
  async writeFile(filepath: string, content: string): Promise<void> {
    fs.writeFileSync(filepath, content, 'utf-8');
    console.log(`[Desktop] File written: ${filepath}`);
  }

  /**
   * Delete file
   */
  async deleteFile(filepath: string): Promise<void> {
    fs.unlinkSync(filepath);
    console.log(`[Desktop] File deleted: ${filepath}`);
  }

  /**
   * List directory
   */
  async listDirectory(dirpath: string): Promise<string[]> {
    return fs.readdirSync(dirpath);
  }

  /**
   * Create directory
   */
  async createDirectory(dirpath: string): Promise<void> {
    fs.mkdirSync(dirpath, { recursive: true });
    console.log(`[Desktop] Directory created: ${dirpath}`);
  }

  /**
   * Check if file exists
   */
  fileExists(filepath: string): boolean {
    return fs.existsSync(filepath);
  }

  // ==================== SHELL COMMANDS ====================

  /**
   * Execute shell command
   */
  async executeCommand(command: string): Promise<{ stdout: string; stderr: string }> {
    console.log(`[Desktop] Executing: ${command}`);
    const { stdout, stderr } = await execAsync(command);
    return { stdout, stderr };
  }

  /**
   * Execute PowerShell command (Windows)
   */
  async executePowerShell(script: string): Promise<{ stdout: string; stderr: string }> {
    return await this.executeCommand(`powershell -Command "${script}"`);
  }

  // ==================== NOTIFICATIONS ====================

  /**
   * Show desktop notification
   */
  showNotification(title: string, message: string): void {
    // Use native Electron notifications
    new Notification({
      title,
      body: message,
    }).show();
  }
}
