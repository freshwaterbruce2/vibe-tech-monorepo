/// <reference types="vite/client" />

// Electron
/// <reference path="./types/electron.d.ts" />
/// <reference path="./types/global.d.ts" />

interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly SSR: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'sudoku-umd';
