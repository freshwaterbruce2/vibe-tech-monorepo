import { Store } from "@tauri-apps/plugin-store";

export class MockStore {
	private data: Record<string, unknown> = {};
	private storePath: string;

	constructor(storePath: string) {
		this.storePath = storePath;
		try {
			if (typeof window !== "undefined" && window.localStorage) {
				const stored = window.localStorage.getItem(`mock_store_${storePath}`);
				if (stored) {
					this.data = JSON.parse(stored) as Record<string, unknown>;
				}
			}
		} catch (e) {
			console.warn(`Failed to load mock store ${storePath} from localStorage:`, e);
		}
	}

	async get<T>(key: string): Promise<T | null> {
		return (this.data[key] as T) ?? null;
	}

	async set(key: string, value: unknown): Promise<void> {
		this.data[key] = value;
	}

	async delete(key: string): Promise<boolean> {
		// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
		delete this.data[key];
		return true;
	}

	async save(): Promise<void> {
		try {
			if (typeof window !== "undefined" && window.localStorage) {
				window.localStorage.setItem(`mock_store_${this.storePath}`, JSON.stringify(this.data));
			}
		} catch (e) {
			console.warn(`Failed to save mock store ${this.storePath} to localStorage:`, e);
		}
	}
}

export const loadStore = async (path: string): Promise<Store | MockStore> => {
	const isTauri = typeof window !== "undefined" && (("__TAURI__" in window) || ("__TAURI_IPC__" in window));
	if (isTauri) {
		return await Store.load(path);
	} else {
		return new MockStore(path);
	}
};
