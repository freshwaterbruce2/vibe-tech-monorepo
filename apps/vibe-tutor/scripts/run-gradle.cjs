const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const appRoot = path.resolve(__dirname, '..');
const androidRoot = path.join(appRoot, 'android');
const tasks = process.argv.slice(2);

if (tasks.length === 0) {
  console.error('[run-gradle] Expected at least one Gradle task.');
  process.exit(1);
}

function addPathIfExists(entries, candidate) {
  if (candidate && fs.existsSync(candidate)) entries.push(candidate);
}

function buildAndroidEnv() {
  const env = { ...process.env };
  const pathKey = Object.keys(env).find((key) => key.toLowerCase() === 'path') || 'Path';
  const pathEntries = [];

  if (process.platform === 'win32') {
    const defaultJavaHome = 'C:\\Program Files\\Android\\Android Studio\\jbr';
    const defaultAndroidHome = path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk');

    if (!env.JAVA_HOME && fs.existsSync(defaultJavaHome)) {
      env.JAVA_HOME = defaultJavaHome;
    }

    if (!env.ANDROID_HOME && fs.existsSync(defaultAndroidHome)) {
      env.ANDROID_HOME = defaultAndroidHome;
    }

    env.ComSpec ||= 'C:\\Windows\\System32\\cmd.exe';
    env.SystemRoot ||= 'C:\\Windows';
    env.PATHEXT ||= '.COM;.EXE;.BAT;.CMD';
  }

  addPathIfExists(pathEntries, env.JAVA_HOME && path.join(env.JAVA_HOME, 'bin'));
  addPathIfExists(pathEntries, env.ANDROID_HOME && path.join(env.ANDROID_HOME, 'platform-tools'));
  addPathIfExists(pathEntries, env.ANDROID_HOME && path.join(env.ANDROID_HOME, 'cmdline-tools', 'latest', 'bin'));

  env[pathKey] = [...pathEntries, env[pathKey]].filter(Boolean).join(path.delimiter);
  return env;
}

const gradleArgs = [...tasks, '--no-daemon', '--console=plain'];
const env = buildAndroidEnv();

console.warn(`[run-gradle] JAVA_HOME=${env.JAVA_HOME || '(not set)'}`);
console.warn(`[run-gradle] ANDROID_HOME=${env.ANDROID_HOME || '(not set)'}`);

const result =
  process.platform === 'win32'
    ? spawnSync(env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', ['.\\gradlew.bat', ...gradleArgs].join(' ')], {
        cwd: androidRoot,
        env,
        stdio: 'inherit',
      })
    : spawnSync('./gradlew', gradleArgs, {
        cwd: androidRoot,
        env,
        stdio: 'inherit',
      });

if (result.error) {
  console.error(`[run-gradle] Failed to start Gradle: ${result.error.message}`);
  process.exit(1);
}

if (typeof result.status === 'number') {
  process.exit(result.status);
}

if (result.signal) {
  console.error(`[run-gradle] Gradle terminated by signal ${result.signal}.`);
}

process.exit(1);
