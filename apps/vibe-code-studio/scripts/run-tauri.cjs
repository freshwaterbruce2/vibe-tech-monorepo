const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const rootCli = path.resolve(__dirname, '../../../node_modules/@tauri-apps/cli/tauri.js');
const localCli = path.resolve(projectRoot, 'node_modules/@tauri-apps/cli/tauri.js');

function resolveTauriCli() {
  if (fs.existsSync(localCli)) {
    return localCli;
  }

  if (fs.existsSync(rootCli)) {
    return rootCli;
  }

  console.error('[run-tauri] Unable to find @tauri-apps/cli.');
  process.exit(1);
}

function loadWindowsBuildEnv(baseEnv) {
  if (process.platform !== 'win32') {
    return baseEnv;
  }

  const os = require('node:os');

  // Use vswhere.exe (official Microsoft VS locator) to find the installation
  const vsInstallerDir = path.join(
    process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)',
    'Microsoft Visual Studio', 'Installer'
  );
  const vswhere = path.join(vsInstallerDir, 'vswhere.exe');

  if (!fs.existsSync(vswhere)) {
    console.warn('[run-tauri] vswhere.exe not found. Install Visual Studio Build Tools.');
    return baseEnv;
  }

  const result = spawnSync(vswhere, [
    '-latest', '-prerelease', '-products', '*',
    '-requires', 'Microsoft.VisualStudio.Component.VC.Tools.x86.x64',
    '-property', 'installationPath',
  ], { encoding: 'utf8' });

  const installPath = (result.stdout || '').trim();
  if (!installPath) {
    console.warn('[run-tauri] No VS installation with C++ tools found via vswhere.');
    return baseEnv;
  }

  const vcvarsPath = path.join(installPath, 'VC', 'Auxiliary', 'Build', 'vcvars64.bat');
  if (!fs.existsSync(vcvarsPath)) {
    console.warn(`[run-tauri] vcvars64.bat not found at: ${vcvarsPath}`);
    return baseEnv;
  }

  console.log(`[run-tauri] Loading MSVC env from: ${vcvarsPath}`);

  // Use a temp batch file to avoid cmd.exe quoting issues with spaces in paths.
  // Also prepend the VS Installer dir to PATH so vcvarsall.bat can find vswhere.exe.
  const tmpBat = path.join(os.tmpdir(), `run-tauri-vcvars-${process.pid}.bat`);
  fs.writeFileSync(tmpBat, [
    '@echo off',
    `set "PATH=${vsInstallerDir};%PATH%"`,
    `call "${vcvarsPath}" >nul 2>&1`,
    'set',
  ].join('\r\n') + '\r\n');

  try {
    const envDump = spawnSync('cmd.exe', ['/c', tmpBat], {
      cwd: projectRoot,
      encoding: 'utf8',
      env: baseEnv,
    });

    if (envDump.status !== 0 || !envDump.stdout) {
      console.warn('[run-tauri] vcvars64.bat failed. C++ build may fail.');
      return baseEnv;
    }

    const mergedEnv = { ...baseEnv };
    for (const line of envDump.stdout.split(/\r?\n/)) {
      const separator = line.indexOf('=');
      if (separator <= 0) {
        continue;
      }
      const key = line.slice(0, separator);
      const value = line.slice(separator + 1);
      mergedEnv[key] = value;
    }

    // Verify critical vars were set
    if (mergedEnv.INCLUDE && mergedEnv.LIB) {
      console.log('[run-tauri] MSVC environment loaded successfully.');
    } else {
      console.warn('[run-tauri] vcvars64.bat ran but INCLUDE/LIB not set. Build may fail.');
    }

    return mergedEnv;
  } finally {
    try { fs.unlinkSync(tmpBat); } catch {}
  }
}

const tauriCli = resolveTauriCli();
const env = loadWindowsBuildEnv(process.env);
const args = [tauriCli, ...process.argv.slice(2)];

const result = spawnSync(process.execPath, args, {
  cwd: projectRoot,
  env,
  stdio: 'inherit',
});

if (result.error) {
  console.error('[run-tauri] Failed to start Tauri:', result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
