/* eslint-disable */
/**
 * Browser-safe stub for Node.js built-in modules.
 * This is used via Vite aliases to satisfy imports of fs, path, stream, etc.
 * in browser bundles without causing runtime exceptions.
 */

const noop = () => {};
const noopStr = () => "";
const noopArr = () => [];
const noopPromise = () => Promise.resolve();

// fs stubs
export const existsSync = () => false;
export const readFileSync = noopStr;
export const writeFileSync = noop;
export const mkdirSync = noop;
export const readdirSync = noopArr;
export const accessSync = noop;
export const statSync = () => ({ size: 0, mtime: new Date(), isDirectory: () => false, isFile: () => true });
export const lstatSync = () => ({ size: 0, mtime: new Date(), isDirectory: () => false, isFile: () => true });
export const realpathSync = (p: string) => p || "";
export const watch = () => ({ close: noop, on: () => ({ on: () => {} }) });
export const watchFile = noop;
export const unwatchFile = noop;
export const readFile = noopPromise;
export const writeFile = noopPromise;
export const mkdir = noopPromise;
export const stat = () => Promise.resolve({ size: 0, mtime: new Date(), isDirectory: () => false, isFile: () => true });
export const lstat = () => Promise.resolve({ size: 0, mtime: new Date(), isDirectory: () => false, isFile: () => true });
export const realpath = (p: string) => Promise.resolve(p || "");
export const readdir = () => Promise.resolve([]);
export const open = () => Promise.resolve({ close: noopPromise, read: noopPromise, write: noopPromise });
export const exists = noopPromise;
export const constants = { W_OK: 2, R_OK: 4, F_OK: 0 };
export class Stats { isDirectory() { return false; } isFile() { return true; } }

// path stubs
export const join = (...a: string[]) => a.join("/");
export const resolve = (...a: string[]) => a.join("/");
export const normalize = (p: string) => p || "";
export const relative = (from: string, to: string) => to || "";
export const sep = "/";
export const basename = (p: string) => (p || "").split("/").pop() || "";
export const dirname = (p: string) => (p || "").split("/").slice(0, -1).join("/");
export const extname = (p: string) => { const idx = (p || "").lastIndexOf("."); return idx > -1 ? (p || "").slice(idx) : ""; };
export const isAbsolute = (p: string) => (p || "").startsWith("/") || (p || "").includes(":");

// child_process stubs
export const exec = noop;
export const execSync = noopStr;
export const spawn = noop;

// util stubs
export const promisify = (fn: any) => fn;
export const inherits = noop;
export const deprecate = (fn: any) => fn;
export const callbackify = (fn: any) => fn;

// electron stubs
export const app = { getPath: () => "/stub" };
export const ipcMain = {};
export const ipcRenderer = {};
export const BrowserWindow = {};

// os stubs
export const type = () => "Windows_NT";
export const platform = () => "win32";
export const arch = () => "x64";
export const homedir = () => "/user/home";
export const tmpdir = () => "/tmp";
export const release = () => "10.0.0";

// crypto stubs
export const createHash = () => ({
	update: () => ({
		digest: () => "stubbed-hash"
	})
});

// url stubs
export const pathToFileURL = (p: string) => new URL("file:///" + (p || "").replace(/\\/g, "/"));

// stream stubs
export class Readable {
	static from() { return new Readable(); }
	pipe(dest: any) { return dest; }
	on() { return this; }
	once() { return this; }
	emit() { return true; }
}
export class Writable {
	pipe(dest: any) { return dest; }
	on() { return this; }
}
export class Transform {
	pipe(dest: any) { return dest; }
	on() { return this; }
}
export class PassThrough {
	pipe(dest: any) { return dest; }
	on() { return this; }
}
export class Stream {
	pipe(dest: any) { return dest; }
	on() { return this; }
}
export class Duplex extends Readable {}
export const pipeline = noop;

// events stubs
export class EventEmitter {
	on() { return this; }
	once() { return this; }
	off() { return this; }
	emit() { return true; }
	removeAllListeners() { return this; }
}

// process stub
export const process = {
	env: { NODE_ENV: "development" },
	cwd: () => "/",
	stderr: { write: () => {} },
	stdout: { write: () => {} },
	nextTick: (cb: any) => setTimeout(cb, 0),
	platform: "win32",
};

// async_hooks stub
export class AsyncLocalStorage<T = any> {
	disable() {}
	getStore(): T | undefined { return undefined; }
	run<R>(store: T, callback: (...args: any[]) => R, ...args: any[]): R {
		return callback(...args);
	}
	enterWith(store: T) {}
}

// buffer stubs
export class Buffer {
	static isBuffer() { return false; }
	static from() { return new Buffer(); }
	static alloc() { return new Buffer(); }
	static concat() { return new Buffer(); }
	toString() { return ""; }
}

// network and server stubs
export const http = { createServer: noop, request: noop };
export const https = { createServer: noop, request: noop };
export const net = { createServer: noop, connect: noop, Socket: class Socket {} };
export const tls = { createServer: noop, connect: noop };
export const dns = { lookup: noop, resolve: noop };
export const zlib = { createGzip: noop, createGunzip: noop };
export const readline = { createInterface: noop };
export const vm = { runInContext: noop, createContext: noop };
export const perf_hooks = { performance: { now: () => Date.now() } };

// default export contains all
export default {
	existsSync, readFileSync, writeFileSync, mkdirSync,
	readdirSync, accessSync, statSync, lstatSync, realpathSync, readFile, writeFile,
	mkdir, stat, lstat, realpath, readdir, open, exists, constants, Stats, join, resolve, normalize, relative, sep,
	basename, dirname, extname, isAbsolute, exec, execSync, spawn,
	promisify, inherits, deprecate, callbackify, app, ipcMain, ipcRenderer, BrowserWindow,
	createHash, pathToFileURL,
	Readable, Writable, Transform, PassThrough, Stream, Duplex, pipeline,
	EventEmitter,
	type, platform, arch, homedir, tmpdir, release,
	process,
	AsyncLocalStorage,
	Buffer,
	http,
	https,
	net,
	tls,
	dns,
	zlib,
	readline,
	vm,
	perf_hooks
};

