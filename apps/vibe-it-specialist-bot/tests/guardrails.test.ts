import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildTask } from '../src/tasks.js';

describe('bot quality guardrails', () => {
  const srcDir = path.resolve(__dirname, '../src');

  it('verifies cmd and shell commands are disabled for security', () => {
    expect(() => buildTask('cmd')).toThrow('cmd command is disabled for security');
    expect(() => buildTask('shell')).toThrow('cmd command is disabled for security');
  });

  it('verifies mutating commands require confirmation', () => {
    const mutating = [
      'fix path-policy',
      'fix typescript-version',
      'fix target-coverage',
      'nx reset',
      'pnpm install',
    ];
    for (const cmd of mutating) {
      const task = buildTask(cmd);
      expect(task.requiresConfirmation).toBe(true);
    }
  });

  it('verifies safe diagnostics do not require confirmation', () => {
    const safe = [
      'status',
      'ci',
      'incidents',
      'diagnose',
      'health',
      'optimize',
      'run optimize-trends',
    ];
    for (const cmd of safe) {
      const task = buildTask(cmd);
      expect(task.requiresConfirmation).toBe(false);
    }
  });

  it('verifies log paths default to D:/logs/', () => {
    const task = buildTask('status');
    expect(task.logPath.startsWith('D:/logs/')).toBe(true);
    expect(task.historyPath.startsWith('D:/logs/')).toBe(true);
  });

  it('verifies no emoji or Unicode headers in source files', () => {
    const files = fs.readdirSync(srcDir);
    const emojiRegex = /\p{Extended_Pictographic}/u;

    for (const file of files) {
      if (file.endsWith('.ts')) {
        const content = fs.readFileSync(path.join(srcDir, file), 'utf8');
        // Strip comments to only check operational code strings
        const codeOnly = content.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
        expect(emojiRegex.test(codeOnly)).toBe(false);
      }
    }
  });

  it('verifies no unsafe child_process.exec is used', () => {
    const files = fs.readdirSync(srcDir);
    for (const file of files) {
      if (file.endsWith('.ts')) {
        const content = fs.readFileSync(path.join(srcDir, file), 'utf8');
        const codeOnly = content.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1');
        expect(codeOnly).not.toContain('execSync(');
        expect(codeOnly).not.toContain('execFile(');
        expect(codeOnly).not.toContain('exec(');
      }
    }
  });
});
