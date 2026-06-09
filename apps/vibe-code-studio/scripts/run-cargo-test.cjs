const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const tauriRoot = path.join(projectRoot, 'src-tauri');

function loadWindowsBuildEnv(baseEnv) {
  if (process.platform !== 'win32') {
    return baseEnv;
  }

  const os = require('node:os');
  const vsInstallerDir = path.join(
    process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)',
    'Microsoft Visual Studio', 'Installer'
  );
  const vswhere = path.join(vsInstallerDir, 'vswhere.exe');

  if (!fs.existsSync(vswhere)) {
    console.warn('[run-cargo-test] vswhere.exe not found.');
    return baseEnv;
  }

  const result = spawnSync(vswhere, [
    '-latest', '-prerelease', '-products', '*',
    '-requires', 'Microsoft.VisualStudio.Component.VC.Tools.x86.x64',
    '-property', 'installationPath',
  ], { encoding: 'utf8' });

  const installPath = (result.stdout || '').trim();
  if (!installPath) {
    console.warn('[run-cargo-test] No VS installation with C++ tools found.');
    return baseEnv;
  }

  const vcvarsPath = path.join(installPath, 'VC', 'Auxiliary', 'Build', 'vcvars64.bat');
  if (!fs.existsSync(vcvarsPath)) {
    console.warn(`[run-cargo-test] vcvars64.bat not found at: ${vcvarsPath}`);
    return baseEnv;
  }

  const tmpBat = path.join(os.tmpdir(), `run-cargo-test-vcvars-${process.pid}.bat`);
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
      return baseEnv;
    }

    const mergedEnv = { ...baseEnv };
    for (const line of envDump.stdout.split(/\r?\n/)) {
      const separator = line.indexOf('=');
      if (separator <= 0) continue;
      const key = line.slice(0, separator);
      const value = line.slice(separator + 1);
      mergedEnv[key] = value;
    }

    return mergedEnv;
  } finally {
    try { fs.unlinkSync(tmpBat); } catch {}
  }
}

const env = loadWindowsBuildEnv(process.env);
const cargoProcess = spawnSync('cargo', ['test'], {
  cwd: tauriRoot,
  env,
  stdio: 'inherit',
});

process.exit(cargoProcess.status ?? 0);
