const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '..', 'src', 'lib', 'tauri-bridge.ts');
let code = fs.readFileSync(file, 'utf8');

code = code.replace(/const BROWSER_MOCK_APPS:[\s\S]*?\];\n*/, '');

code = code.replace(
  /export async function getApps\(\): Promise<VibeAppManifest\[\]> \{\n {2}return \(await tauriInvoke<VibeAppManifest\[\]>\('get_apps'\)\) \?\? BROWSER_MOCK_APPS;\n\}/g,
  `export async function getApps(): Promise<VibeAppManifest[]> {
  return (await tauriInvoke<VibeAppManifest[]>('get_apps')) ?? [];
}`,
);

code = code.replace(
  /export async function launchApp\(appId: string\): Promise<LaunchResult> \{[\s\S]*?app_type: 'web',\n {2}\};\n\}/g,
  `export async function launchApp(appId: string): Promise<LaunchResult> {
  const tauriResult = await tauriInvoke<LaunchResult>('launch_app', { appId });
  if (tauriResult) return tauriResult;

  throw new Error(\`Failed to launch app: \${appId} (Not running in Tauri context)\`);
}`,
);

fs.writeFileSync(file, code);
console.warn('Done');
