/**
 * Empty stub module for Node.js builtins that leak into the browser bundle.
 *
 * src/features/*.ts and src/cli.ts import fs, path, child_process, etc.
 * These are CLI-only code paths that never execute in the Tauri WebView,
 * but Vite still bundles them. This stub satisfies the imports at build time
 * without crashing the browser at runtime.
 */

// Default export (covers `import fs from "fs"`)
export default {};

// Named exports used by the leaking code
export const join = (...args: string[]) => args.join("/");
export const resolve = (...args: string[]) => args.join("/");
export const basename = (p: string) => p.split("/").pop() ?? "";
export const dirname = (p: string) => p.split("/").slice(0, -1).join("/");
export const existsSync = () => false;
export const readFileSync = () => "";
export const writeFileSync = () => {};
export const mkdirSync = () => {};
export const readdirSync = () => [];
export const readFile = async () => Promise.resolve("");
export const writeFile = async () => Promise.resolve();
export const mkdir = async () => Promise.resolve();
export const exists = async () => Promise.resolve(false);
export const exec = () => {};
export const promisify = (fn: unknown) => fn;
