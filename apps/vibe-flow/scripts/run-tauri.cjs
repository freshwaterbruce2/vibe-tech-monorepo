// Tauri CLI wrapper: loads the MSVC build env via vswhere + vcvars64 so the
// Rust build never needs a pinned linker path in .cargo/config.toml.
// Pattern adapted from apps/vibe-code-studio/scripts/run-tauri.cjs (minus the
// companion backend server — vibe-flow has no sidecar).
const { spawnSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
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
  return null;
}

function findVcvars() {
  const programFilesX86 = process.env['ProgramFiles(x86)'];
  if (!programFilesX86) {
    console.warn('[run-tauri] ProgramFiles(x86) env var not set; skipping MSVC env.');
    return null;
  }
  const vsInstallerDir = path.join(programFilesX86, 'Microsoft Visual Studio', 'Installer');
  const vswhere = path.join(vsInstallerDir, 'vswhere.exe');
  if (!fs.existsSync(vswhere)) {
    console.warn('[run-tauri] vswhere.exe not found. Install Visual Studio Build Tools.');
    return null;
  }

  const result = spawnSync(
    vswhere,
    [
      '-latest',
      '-prerelease',
      '-products',
      '*',
      '-requires',
      'Microsoft.VisualStudio.Component.VC.Tools.x86.x64',
      '-property',
      'installationPath',
    ],
    { encoding: 'utf8' },
  );

  const installPath = (result.stdout || '').trim();
  if (!installPath) {
    console.warn('[run-tauri] No VS installation with C++ tools found via vswhere.');
    return null;
  }

  const vcvarsPath = path.join(installPath, 'VC', 'Auxiliary', 'Build', 'vcvars64.bat');
  if (!fs.existsSync(vcvarsPath)) {
    console.warn(`[run-tauri] vcvars64.bat not found at: ${vcvarsPath}`);
    return null;
  }
  return { vcvarsPath, vsInstallerDir };
}

function captureVcvarsEnv(baseEnv, vcvarsPath, vsInstallerDir) {
  // Use a temp batch file to avoid cmd.exe quoting issues with spaces in paths.
  const tmpBat = path.join(os.tmpdir(), `run-tauri-vcvars-${process.pid}.bat`);
  fs.writeFileSync(
    tmpBat,
    `${[
      '@echo off',
      `set "PATH=${vsInstallerDir};%PATH%"`,
      `call "${vcvarsPath}" >nul 2>&1`,
      'set',
    ].join('\r\n')  }\r\n`,
  );

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
      if (separator > 0) {
        mergedEnv[line.slice(0, separator)] = line.slice(separator + 1);
      }
    }
    if (!mergedEnv.INCLUDE || !mergedEnv.LIB) {
      console.warn('[run-tauri] vcvars64.bat ran but INCLUDE/LIB not set. Build may fail.');
    }
    return mergedEnv;
  } finally {
    try {
      fs.unlinkSync(tmpBat);
    } catch {
      /* best-effort cleanup */
    }
  }
}

function loadWindowsBuildEnv(baseEnv) {
  if (process.platform !== 'win32') {
    return baseEnv;
  }
  const located = findVcvars();
  if (!located) {
    return baseEnv;
  }
  return captureVcvarsEnv(baseEnv, located.vcvarsPath, located.vsInstallerDir);
}

const tauriCli = resolveTauriCli();
const env = loadWindowsBuildEnv(process.env);
const args = [tauriCli, ...process.argv.slice(2)];

const tauriProcess = spawn(process.execPath, args, {
  cwd: projectRoot,
  env,
  stdio: 'inherit',
});

tauriProcess.on('exit', (code) => {
  process.exit(code ?? 0);
});

tauriProcess.on('error', (err) => {
  console.error('[run-tauri] Failed to start Tauri:', err.message);
  process.exit(1);
});
