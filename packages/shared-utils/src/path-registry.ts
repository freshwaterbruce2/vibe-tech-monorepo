import fs from 'fs';
import path from 'path';
export const getIntelligencePath = () => {
  const preferred = 'D:\\data\\ai-models';
  let userDataPath: string;
  try {
    // Use eval to prevent static analyzers (like Vite's esbuild) from seeing this as a dependency
    const electronApp = (0, eval)("require('electron')").app;
    userDataPath = electronApp.getPath('userData');
  } catch {
    // Fallback for non-electron environments or before app is ready
    userDataPath = path.join(process.cwd(), 'userData');
  }

  const fallback = path.join(userDataPath, 'models');

  try {
    // Check for drive existence and write permissions
    if (process.platform === 'win32' && fs.existsSync('D:\\')) {
      try {
        fs.accessSync('D:\\', fs.constants.W_OK);
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
  try {
    const electronApp = (0, eval)("require('electron')").app;
    userDataPath = electronApp.getPath('userData');
  } catch {
    userDataPath = path.join(process.cwd(), 'userData');
  }

  const fallback = path.join(userDataPath, subDir);

  try {
    if (process.platform === 'win32' && fs.existsSync('D:\\')) {
      try {
        fs.accessSync('D:\\', fs.constants.W_OK);
        return path.join(preferredBase, subDir);
      } catch {
        return fallback;
      }
    }
  } catch {
    return fallback;
  }
  return fallback;
};
