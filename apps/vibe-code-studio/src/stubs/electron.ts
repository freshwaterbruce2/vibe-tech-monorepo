// Stub for the 'electron' module in browser/Tauri environments.
// Prevents Vite dev server from resolving node_modules/electron/index.js
// which crashes because it requires Node.js built-in modules (path, fs, etc.)
export default {};
export const ipcRenderer = {
  invoke: async () => null,
  on: () => {},
  send: () => {},
};
export const shell = { openExternal: async () => {} };
export const app = { getPath: () => '' };
export const dialog = { showOpenDialog: async () => ({ canceled: true, filePaths: [] }) };
