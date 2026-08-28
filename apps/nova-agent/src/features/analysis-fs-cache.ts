import fs from "fs";

/** Per-review filesystem cache to eliminate redundant syscalls. */
export class FsCache {
	private existsCache = new Map<string, boolean>();
	private statCache = new Map<string, fs.Stats | null>();
	private readCache = new Map<string, string | null>();
	private readdirCache = new Map<string, fs.Dirent[]>();
	private jsonCache = new Map<string, unknown>();

	exists(p: string): boolean {
		let v = this.existsCache.get(p);
		if (v === undefined) {
			v = fs.existsSync(p);
			this.existsCache.set(p, v);
		}
		return v;
	}

	stat(p: string): fs.Stats | null {
		let v = this.statCache.get(p);
		if (v === undefined) {
			try {
				v = fs.statSync(p);
			} catch {
				v = null;
			}
			this.statCache.set(p, v);
		}
		return v;
	}

	isDirectory(p: string): boolean {
		return this.stat(p)?.isDirectory() === true;
	}

	readFile(p: string): string | null {
		let v = this.readCache.get(p);
		if (v === undefined) {
			try {
				v = fs.readFileSync(p, "utf-8");
			} catch {
				v = null;
			}
			this.readCache.set(p, v);
		}
		return v;
	}

	readdir(p: string): fs.Dirent[] {
		let v = this.readdirCache.get(p);
		if (v === undefined) {
			try {
				v = fs.readdirSync(p, { withFileTypes: true });
			} catch {
				v = [];
			}
			this.readdirCache.set(p, v);
		}
		return v;
	}

	readJson<T>(p: string): T | null {
		if (this.jsonCache.has(p)) return this.jsonCache.get(p) as T | null;
		const text = this.readFile(p);
		if (text === null) {
			this.jsonCache.set(p, null);
			return null;
		}
		try {
			const parsed = JSON.parse(text) as T;
			this.jsonCache.set(p, parsed);
			return parsed;
		} catch {
			this.jsonCache.set(p, null);
			return null;
		}
	}
}
