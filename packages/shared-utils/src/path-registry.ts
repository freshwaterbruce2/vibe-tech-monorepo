// Dynamically resolve Node built-ins to prevent bundlers (like Vite) from trying to resolve them in browser environments
const fs = typeof window === 'undefined' ? (0, eval)("require('fs')") : null;
const path = typeof window === 'undefined' ? (0, eval)("require('path')") : null;

export const getIntelligencePath = () => {
  const preferred = 'D:\\data\\ai-models';
  let userDataPath: string;
  const p = path;
  const f = fs;
  try {
    // Use eval to prevent static analyzers (like Vite's esbuild) from seeing this as a dependency
    const electronApp = (0, eval)("require('electron')").app;
    userDataPath = electronApp.getPath('userData');
  } catch {
    // Fallback for non-electron environments or before app is ready
    userDataPath = p ? p.join(process.cwd(), 'userData') : 'userData';
  }

  const fallback = p ? p.join(userDataPath, 'models') : '';

  try {
    // Check for drive existence and write permissions
    if (process.platform === 'win32' && f?.existsSync('D:\\')) {
      try {
        f.accessSync('D:\\', f.constants.W_OK);
        return preferred;
      } catch {
        return fallback;
      }
    }
  } catch {
    return fallback;
  }
  return fallback;
};

export const getStoragePath = (subDir: string) => {
  const preferredBase = 'D:\\data\\vibe-code-studio';

  let userDataPath: string;
  const p = path;
  const f = fs;
  try {
    const electronApp = (0, eval)("require('electron')").app;
    userDataPath = electronApp.getPath('userData');
  } catch {
    userDataPath = p ? p.join(process.cwd(), 'userData') : 'userData';
  }

  const fallback = p ? p.join(userDataPath, subDir) : subDir;

  try {
    if (process.platform === 'win32' && f?.existsSync('D:\\')) {
      try {
        f.accessSync('D:\\', f.constants.W_OK);
        return p ? p.join(preferredBase, subDir) : preferredBase;
      } catch {
        return fallback;
      }
    }
  } catch {
    return fallback;
  }
  return fallback;
};

