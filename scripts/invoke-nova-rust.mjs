#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const validCommands = new Map([
  ['check', ['check']],
  ['test', ['test']],
  ['build', ['build']],
  ['build-release', ['build', '--release']],
]);

const command = process.argv[2] ?? 'check';
const cargoArgs = validCommands.get(command);
const passthroughArgs = process.argv.slice(3);

if (!cargoArgs) {
  console.error(`Unsupported Nova Rust command: ${command}`);
  console.error(`Expected one of: ${Array.from(validCommands.keys()).join(', ')}`);
  process.exit(2);
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tauriRoot = join(repoRoot, 'apps', 'nova-agent', 'src-tauri');

if (!existsSync(tauriRoot)) {
  console.error(`Missing Nova Tauri root: ${tauriRoot}`);
  process.exit(2);
}

const windowsRoot = process.env.SystemRoot || 'C:\\Windows';
const windowsSystem32 = join(windowsRoot, 'System32');
// TODO: Use vswhere.exe for dynamic discovery of MSVC and Windows SDK paths.
const msvcVersion = process.env.VC_TOOLS_VERSION || '14.44.35207';
const windowsSdkVersion = process.env.WINDOWS_SDK_VERSION || '10.0.26100.0';
const vsTools =
  `C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\VC\\Tools\\MSVC\\${msvcVersion}`;
const windowsSdk = 'C:\\Program Files (x86)\\Windows Kits\\10';

const env = {
  ...process.env,
  SystemRoot: windowsRoot,
  WINDIR: process.env.WINDIR || windowsRoot,
  SystemDrive: process.env.SystemDrive || 'C:',
  ComSpec: process.env.ComSpec || join(windowsSystem32, 'cmd.exe'),
  PATHEXT: process.env.PATHEXT || '.COM;.EXE;.BAT;.CMD;.VBS;.VBE;.JS;.JSE;.WSF;.WSH;.MSC',
  PROCESSOR_ARCHITECTURE: process.env.PROCESSOR_ARCHITECTURE || 'AMD64',
  VSCMD_SKIP_SENDTELEMETRY: '1',
  DOTNET_CLI_TELEMETRY_OPTOUT: '1',
  VCINSTALLDIR: 'C:\\Program Files (x86)\\Microsoft Visual Studio\\2022\\BuildTools\\VC\\',
  VCToolsVersion: msvcVersion,
  CC: join(vsTools, 'bin', 'HostX64', 'x64', 'cl.exe'),
  CXX: join(vsTools, 'bin', 'HostX64', 'x64', 'cl.exe'),
  INCLUDE: [
    join(vsTools, 'include'),
    join(windowsSdk, 'Include', windowsSdkVersion, 'ucrt'),
    join(windowsSdk, 'Include', windowsSdkVersion, 'shared'),
    join(windowsSdk, 'Include', windowsSdkVersion, 'um'),
    join(windowsSdk, 'Include', windowsSdkVersion, 'winrt'),
  ].join(';'),
  LIB: [
    join(vsTools, 'lib', 'x64'),
    join(windowsSdk, 'Lib', windowsSdkVersion, 'ucrt', 'x64'),
    join(windowsSdk, 'Lib', windowsSdkVersion, 'um', 'x64'),
  ].join(';'),
  PATH: [
    join(vsTools, 'bin', 'HostX64', 'x64'),
    join(windowsSdk, 'bin', windowsSdkVersion, 'x64'),
    windowsSystem32,
    process.env.PATH ?? '',
  ].join(';'),
};

const result = spawnSync('cargo', [...cargoArgs, ...passthroughArgs], {
  cwd: tauriRoot,
  env,
  stdio: 'inherit',
  shell: false,
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
