declare module 'lucide-react';

// Firebase module augmentations — the SDK exports these at runtime but
// the shipped .d.ts files omit them from the public surface.
declare module 'firebase/firestore' {
  export function connectFirestoreEmulator(firestore: any, host: string, port: number): void;
  export function onSnapshot(reference: any, observer: any): () => void;
  export function onSnapshot(reference: any, onNext: any, onError?: any): () => void;
  export function enableNetwork(firestore: any): Promise<void>;
  export function disableNetwork(firestore: any): Promise<void>;
  export function serverTimestamp(): any;
  export function arrayUnion(...elements: any[]): any;
  export function arrayRemove(...elements: any[]): any;
  export function increment(n: number): any;
  export function writeBatch(firestore: any): any;
  export function addDoc(reference: any, data: any): Promise<any>;
  export class Timestamp {
    constructor(seconds: number, nanoseconds: number);
    static now(): Timestamp;
    static fromDate(date: Date): Timestamp;
    toDate(): Date;
    seconds: number;
    nanoseconds: number;
  }
  export class DocumentSnapshot {
    exists(): boolean;
    data(): any;
    id: string;
    ref: any;
  }
  export class FirestoreError extends Error {
    code: string;
  }
}

declare module 'firebase/analytics' {
  export function isSupported(): Promise<boolean>;
}

// Missing module stubs
declare module '_path' {
  export function join(...paths: string[]): string;
  const _default: any;
  export default _default;
}

declare module '../shared/utils/pwa-metrics.js' {
  export function initPerformanceMonitoring(): void;
  const _default: any;
  export default _default;
}

// Electron API bridge exposed via preload script
// Note: store methods are synchronous (electron-store IPC uses sendSync)
interface ElectronAPI {
  getEnvVariable: (key: string) => string | undefined;
  getPlatform: () => string;
  getVersion: () => string;
  sendNotification: (title: string, body: string) => void;
  onDeepLink: (callback: (url: string) => void) => void;
  openExternal: (url: string) => Promise<void>;
  store: {
    get: (key: string) => any;
    set: (key: string, value: any) => void;
    delete: (key: string) => void;
  };
  [key: string]: any;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    gtag?: (...args: any[]) => void;
  }
}

// Jest DOM type extensions
import '@testing-library/jest-dom';
