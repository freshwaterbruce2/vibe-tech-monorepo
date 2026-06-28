// Empty shim for Node.js builtins that are imported by dependencies (e.g. crypto-js, shared-config)
// but not actually used in the browser runtime.

export const existsSync = () => false;
export const readFileSync = () => '';
export const writeFileSync = () => {};
export const mkdirSync = () => {};
export const promises = {
  readFile: async () => '',
  writeFile: async () => {},
  mkdir: async () => {},
};

export const resolve = (...args: string[]) => args.join('/');
export const normalize = (p: string) => p;
export const join = (...args: string[]) => args.join('/');
export const dirname = (p: string) => p;
export const basename = (p: string) => p;
export const extname = (p: string) => (p ? '' : '');

export const platform = () => 'win32';
export const homedir = () => '';
export const arch = () => 'x64';
export const release = () => '';

export const createHash = () => ({
  update: () => ({ digest: () => '' }),
});
export const randomBytes = () => new Uint8Array(0);

export class Readable {}
export class Writable {}
export class Transform {}
export class PassThrough {}

// monacopilot's browser entry statically re-imports { Copilot, logger } from
// '@monacopilot/core' (aliased to this shim). Only registerCompletion runs in the
// browser; the Copilot class is server-only and never instantiated client-side, so
// these satisfy the static import without bundling the Node-dependent core.
export class Copilot {}
export const logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  log: () => {},
};

const empty = {};
export default empty;
