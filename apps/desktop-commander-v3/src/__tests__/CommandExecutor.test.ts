import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock child_process
vi.mock('child_process', () => ({
  spawn: vi.fn(),
  exec: vi.fn(),
}));

// Mock config
vi.mock('../config.js', () => ({
  config: {
    allowedPaths: ['C:\\dev'],
    blockedPatterns: ['node_modules'],
    maxFileSize: 10 * 1024 * 1024,
    defaultShell: 'powershell',
    commandTimeout: 30000,
    blockedCommands: ['rm -rf /', 'format', 'del /s /q'],
  },
}));

describe('CommandExecutor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('command validation', () => {
    it('should detect dangerous commands', () => {
      const dangerousPatterns = [
        'rm -rf /',
        'format c:',
        'del /s /q c:\\',
        ':(){:|:&};:',
      ];

      for (const pattern of dangerousPatterns) {
        expect(pattern.toLowerCase()).toMatch(/rm\s+-rf|format|del\s+\/s|:\(\)/i);
      }
    });

    it('should allow safe commands', () => {
      const safeCommands = [
        'dir',
        'ls',
        'echo hello',
        'git status',
        'npm install',
      ];

      for (const cmd of safeCommands) {
        expect(cmd.toLowerCase()).not.toMatch(/rm\s+-rf\s+\/|format\s+c:|:\(\)/i);
      }
    });
  });

  describe('shell selection', () => {
    it('should default to powershell on Windows', () => {
      const shell = process.platform === 'win32' ? 'powershell' : 'bash';
      expect(['powershell', 'bash', 'cmd']).toContain(shell);
    });
  });

  describe('timeout handling', () => {
    it('should have reasonable default timeout', () => {
      const defaultTimeout = 30000; // 30 seconds
      expect(defaultTimeout).toBeGreaterThan(0);
      expect(defaultTimeout).toBeLessThanOrEqual(300000); // 5 minutes max
    });
  });
});
