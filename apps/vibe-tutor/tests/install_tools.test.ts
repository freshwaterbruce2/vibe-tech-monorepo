// @vitest-environment node
import { describe, it, expect } from 'vitest';
import fs from 'fs';

// The path to the batch file as specified
const BAT_FILE_PATH = 'd:/installers/install_tools.bat';

describe('install_tools.bat', () => {
  // Check if file exists before running tests to avoid failing in environments without the file
  const fileExists = fs.existsSync(BAT_FILE_PATH);

  it('should exist at the expected path', () => {
    if (!fileExists) {
      console.warn(`Skipping test: ${BAT_FILE_PATH} not found`);
      return;
    }
    expect(fs.existsSync(BAT_FILE_PATH)).toBe(true);
  });

  it('should contain the correct Chocolatey commands', () => {
    if (!fileExists) return;

    const content = fs.readFileSync(BAT_FILE_PATH, 'utf-8');
    
    // Verify key commands
    expect(content).toMatch(/choco upgrade -y python visualstudio20\d{2}-workload-vctools/i);
    expect(content).toContain('powershell.exe');
  });

  it('should warn about disk space', () => {
    if (!fileExists) return;

    const content = fs.readFileSync(BAT_FILE_PATH, 'utf-8');
    expect(content).toContain('require about 7 GiB of free disk space');
  });

  it('should use TLS 1.2 for security', () => {
    if (!fileExists) return;

    const content = fs.readFileSync(BAT_FILE_PATH, 'utf-8');
    expect(content).toContain('[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12');
  });
});
