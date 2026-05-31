/* eslint-disable no-console, no-await-in-loop */
import { access, readFile, readdir } from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, '..');
const tauriRoot = path.join(projectRoot, 'src-tauri');

const checks = [];

await checkFile(
  path.join(projectRoot, 'dist', 'index.html'),
  'frontend-dist',
  'Frontend build output exists',
);
await checkJsonIncludes(
  path.join(tauriRoot, 'tauri.conf.json'),
  '"frontendDist"',
  'tauri-config',
  'Tauri config includes frontendDist wiring',
);
await checkJsonIncludes(
  path.join(tauriRoot, 'tauri.conf.json'),
  '"icons/icon.ico"',
  'tauri-icons-config',
  'Tauri config includes Windows icon wiring',
);
await checkFile(path.join(tauriRoot, 'Cargo.toml'), 'cargo-manifest', 'Cargo manifest exists');
await checkFile(
  path.join(tauriRoot, 'build.rs'),
  'tauri-build-script',
  'Tauri build script exists',
);
await checkFile(
  path.join(tauriRoot, 'icons', 'icon.ico'),
  'tauri-windows-icon',
  'Windows icon exists',
);
checkCommand('cargo', ['--version'], 'cargo', 'Cargo is installed');
checkCommand('rustc', ['--version'], 'rustc', 'rustc is installed');
await checkMsvcRuntime();

for (const check of checks) {
  console.log(`${check.ok ? 'PASS' : 'FAIL'} [${check.id}] ${check.detail}`);
}

if (checks.some((check) => !check.ok)) {
  process.exitCode = 1;
}

async function checkFile(filePath, id, detail) {
  try {
    await access(filePath, fsConstants.R_OK);
    checks.push({ id, ok: true, detail });
  } catch {
    checks.push({ id, ok: false, detail: `${detail}. Missing: ${filePath}` });
  }
}

async function checkJsonIncludes(filePath, needle, id, detail) {
  try {
    const text = await readFile(filePath, 'utf8');
    checks.push({
      id,
      ok: text.includes(needle),
      detail: text.includes(needle) ? detail : `${detail}. Missing token: ${needle}`,
    });
  } catch (error) {
    checks.push({
      id,
      ok: false,
      detail: `Unable to read ${path.basename(filePath)}: ${formatError(error)}`,
    });
  }
}

function checkCommand(command, args, id, detail) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  checks.push({
    id,
    ok: result.status === 0,
    detail:
      result.status === 0
        ? `${detail} (${(result.stdout || '').trim()})`
        : `${detail} check failed: ${(result.stderr || result.stdout || '').trim() || 'command not available'}`,
  });
}

async function checkMsvcRuntime() {
  const result = await findMsvcRuntime();

  if (result.desktopPath) {
    checks.push({
      id: 'msvc-runtime',
      ok: true,
      detail: `Desktop MSVC runtime library is present at ${result.desktopPath}`,
    });
    return;
  }

  if (result.oneCorePaths.length > 0) {
    checks.push({
      id: 'msvc-runtime',
      ok: false,
      detail: `Only OneCore MSVC runtime libraries were found: ${result.oneCorePaths.join(', ')}`,
    });
    return;
  }

  checks.push({
    id: 'msvc-runtime',
    ok: false,
    detail:
      'No desktop x64 msvcrt.lib was found in LIB, VCToolsInstallDir, or installed Visual Studio roots',
  });
}

async function findMsvcRuntime() {
  const desktopCandidates = [];
  const oneCoreCandidates = [];

  for (const libDir of splitPathList(process.env.LIB)) {
    desktopCandidates.push(path.join(libDir, 'msvcrt.lib'));
  }

  for (const toolRoot of await collectMsvcToolRoots()) {
    desktopCandidates.push(path.join(toolRoot, 'lib', 'x64', 'msvcrt.lib'));
    oneCoreCandidates.push(path.join(toolRoot, 'lib', 'onecore', 'x64', 'msvcrt.lib'));
  }

  for (const candidate of unique(desktopCandidates).filter(
    (candidatePath) => !isOneCorePath(candidatePath),
  )) {
    if (await canRead(candidate)) {
      return {
        desktopPath: candidate,
        oneCorePaths: await readablePaths(oneCoreCandidates),
      };
    }
  }

  return {
    desktopPath: null,
    oneCorePaths: await readablePaths(oneCoreCandidates),
  };
}

async function collectMsvcToolRoots() {
  const roots = [];

  if (process.env.VCToolsInstallDir) {
    roots.push(process.env.VCToolsInstallDir);
  }

  const visualStudioRoots = [
    'C:\\Program Files\\Microsoft Visual Studio',
    'C:\\Program Files (x86)\\Microsoft Visual Studio',
  ];

  for (const visualStudioRoot of visualStudioRoots) {
    for (const majorDir of await safeReadDir(visualStudioRoot)) {
      if (!majorDir.isDirectory()) {
        continue;
      }

      const majorPath = path.join(visualStudioRoot, majorDir.name);
      for (const editionDir of await safeReadDir(majorPath)) {
        if (!editionDir.isDirectory()) {
          continue;
        }

        const msvcRoot = path.join(majorPath, editionDir.name, 'VC', 'Tools', 'MSVC');
        for (const versionDir of await safeReadDir(msvcRoot)) {
          if (versionDir.isDirectory()) {
            roots.push(path.join(msvcRoot, versionDir.name));
          }
        }
      }
    }
  }

  return unique(roots.map((root) => path.normalize(root)));
}

async function safeReadDir(directory) {
  try {
    return await readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function readablePaths(paths) {
  const readable = [];
  for (const candidate of unique(paths)) {
    if (await canRead(candidate)) {
      readable.push(candidate);
    }
  }
  return readable;
}

async function canRead(candidate) {
  try {
    await access(candidate, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function splitPathList(value) {
  return (
    value
      ?.split(';')
      .map((entry) => entry.trim())
      .filter(Boolean) ?? []
  );
}

function unique(values) {
  return [...new Set(values)];
}

function isOneCorePath(candidate) {
  return candidate.toLowerCase().includes(`${path.sep}onecore${path.sep}`);
}

function formatError(error) {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
