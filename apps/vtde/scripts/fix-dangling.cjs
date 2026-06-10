const fs = require('fs');
const path = require('path');

const file = path.resolve(__dirname, '..', 'src', 'lib', 'tauri-bridge.ts');
let code = fs.readFileSync(file, 'utf8');

const replaceGetApps = `export async function getApps(): Promise<VibeAppManifest[]> {
  return (await tauriInvoke<VibeAppManifest[]>('get_apps')) ?? [];
}`;

const replaceLaunchApp = `export async function launchApp(appId: string): Promise<LaunchResult> {
  const tauriResult = await tauriInvoke<LaunchResult>('launch_app', { appId });
  if (tauriResult) return tauriResult;

  throw new Error(\`Failed to launch app: \${appId} (Not running in Tauri context)\`);
}`;

// Use robust replacing by collapsing whitespace for match if needed, or regexes:
code = code.replace(/export async function getApps\(\)[\s\S]*?\}/, replaceGetApps);
code = code.replace(/export async function launchApp[\s\S]*?\n\}/, replaceLaunchApp);

fs.writeFileSync(file, code);
console.warn('Fixed dangling browser-mode fallbacks in tauri-bridge.ts');
