import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCapacitorReleaseServerPolicy } from './android-release-config-validator.mjs';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const files = {
  packageJson: resolve(appRoot, 'package.json'),
  capacitor: resolve(appRoot, 'capacitor.config.ts'),
  variables: resolve(appRoot, 'android/variables.gradle'),
  buildGradle: resolve(appRoot, 'android/app/build.gradle'),
  manifest: resolve(appRoot, 'android/app/src/main/AndroidManifest.xml'),
  fileProviderPaths: resolve(appRoot, 'android/app/src/main/res/xml/file_paths.xml'),
  networkSecurityConfig: resolve(appRoot, 'android/app/src/main/res/xml/network_security_config.xml'),
};

const read = (path) => readFileSync(path, 'utf8');
const failures = [];

function requireMatch(content, pattern, description) {
  if (!pattern.test(content)) {
    failures.push(description);
  }
}

const packageJson = JSON.parse(read(files.packageJson));
const capacitor = read(files.capacitor);
const variables = read(files.variables);
const buildGradle = read(files.buildGradle);
const manifest = read(files.manifest);
const fileProviderPaths = read(files.fileProviderPaths);
const networkSecurityConfig = read(files.networkSecurityConfig);

failures.push(...validateCapacitorReleaseServerPolicy(capacitor));

if (packageJson.version !== '1.5.18') {
  failures.push(`Expected package version 1.5.18, received ${String(packageJson.version)}.`);
}

requireMatch(capacitor, /appId:\s*'com\.vibetech\.tutor'/, 'Capacitor appId must remain com.vibetech.tutor.');
requireMatch(
  capacitor,
  /webContentsDebuggingEnabled:\s*isDevelopment/,
  'Capacitor WebView debugging must remain development-only.',
);
requireMatch(variables, /minSdkVersion\s*=\s*23\b/, 'Android minSdkVersion must be 23.');
requireMatch(variables, /compileSdkVersion\s*=\s*36\b/, 'Android compileSdkVersion must be 36.');
requireMatch(variables, /targetSdkVersion\s*=\s*36\b/, 'Android targetSdkVersion must be 36.');
requireMatch(variables, /androidVersionCode\s*=\s*10518\b/, 'Android versionCode must be 10518.');
requireMatch(buildGradle, /applicationId\s+"com\.vibetech\.tutor"/, 'Android applicationId must remain com.vibetech.tutor.');
requireMatch(buildGradle, /minifyEnabled\s+true/, 'Release minification must remain enabled.');
requireMatch(buildGradle, /shrinkResources\s+true/, 'Release resource shrinking must remain enabled.');
requireMatch(manifest, /android:allowBackup="false"/, 'Release backups must remain disabled.');
requireMatch(manifest, /android:fullBackupContent="false"/, 'Release full backups must remain disabled.');
requireMatch(manifest, /android:usesCleartextTraffic="false"/, 'Release cleartext traffic must remain disabled.');
requireMatch(
  networkSecurityConfig,
  /<base-config\s+cleartextTrafficPermitted="false">/,
  'Release network security config must reject cleartext traffic.',
);
requireMatch(buildGradle, /com\.google\.android\.play:integrity:1\.6\.0/, 'Play Integrity 1.6.0 is required.');
requireMatch(buildGradle, /VIBE_TUTOR_INTEGRITY_CLOUD_PROJECT_NUMBER is required for release builds/, 'Release must fail closed without the Integrity project number.');
requireMatch(buildGradle, /\?: '0'/, 'All Android variants must define a non-secret default Integrity project number of 0.');
requireMatch(buildGradle, /buildConfigField "long", "VIBE_TUTOR_INTEGRITY_CLOUD_PROJECT_NUMBER"/, 'All Android variants must expose the Integrity BuildConfig field.');
requireMatch(buildGradle, /Keystore must not reside inside the Vibe Tutor checkout/, 'Keystore guard must reject a key inside this checkout.');
requireMatch(
  manifest,
  /android:name="\.MainActivity"[\s\S]*?android:exported="true"/,
  'Launcher activity must be explicitly exported.',
);
requireMatch(manifest, /androidx\.media3\.session\.MediaSessionService/, 'Native audio service must expose only MediaSessionService.');
if (/AudioPlayerService[\s\S]*?<intent-filter>[\s\S]*?<action(?! android:name="androidx\.media3\.session\.MediaSessionService")/.test(manifest)) failures.push('Native audio service must not expose extra intent actions.');
requireMatch(
  manifest,
  /android:name="androidx\.core\.content\.FileProvider"[\s\S]*?android:exported="false"/,
  'FileProvider must not be exported.',
);
requireMatch(
  fileProviderPaths,
  /<external-files-path\s+name="capture_images"\s+path="Pictures\/"\s*\/>/,
  'FileProvider image capture must be limited to the app-specific Pictures directory.',
);
requireMatch(fileProviderPaths, /<cache-path\s+name="my_cache_images"\s+path="\."\s*\/>/, 'FileProvider cache path is required.');
if (/<external-path\b/.test(fileProviderPaths)) {
  failures.push('FileProvider must not expose shared external storage through external-path.');
}
requireMatch(
  manifest,
  /android:foregroundServiceType="mediaPlayback"[\s\S]*?android:exported="true"/,
  'MediaSessionService must stay exported for external media controllers.',
);
requireMatch(
  manifest,
  /android\.permission\.FOREGROUND_SERVICE_MEDIA_PLAYBACK/,
  'Media playback foreground-service permission is required.',
);
if (/android\.permission\.READ_MEDIA_AUDIO/.test(manifest)) {
  failures.push('READ_MEDIA_AUDIO is not allowed without a local audio-library feature.');
}

for (const forbiddenAndroid16OptOut of [
  'windowOptOutEdgeToEdgeEnforcement',
  'PROPERTY_COMPAT_ALLOW_RESTRICTED_RESIZABILITY',
  'enableOnBackInvokedCallback="false"',
]) {
  if (manifest.includes(forbiddenAndroid16OptOut)) {
    failures.push(`Android 16 compatibility opt-out is not allowed: ${forbiddenAndroid16OptOut}.`);
  }
}

if (failures.length > 0) {
  console.error('Android release configuration validation failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  process.stdout.write('Android release configuration validation passed (API 36, versionCode 10518, release security invariants).\n');
}
