export interface WorkspaceFolder {
	path: string;
	name?: string;
	settings?: Record<string, unknown>;
}

export interface WorkspaceConfiguration {
	folders: WorkspaceFolder[];
	settings: Record<string, unknown>;
	extensions?: {
		recommendations?: string[];
	};
}

export interface Workspace {
	id: string;
	name: string;
	folders: WorkspaceFolder[];
	settings: Record<string, unknown>;
	createdAt: Date;
}

export interface FileChangeEvent {
	path: string;
	type: "create" | "change" | "delete";
	workspace: string;
}

export interface FileWatcher {
	path: string;
	workspace: string;
	active: boolean;
}

export interface ModelState {
	selection?: {
		startLineNumber: number;
		startColumn: number;
		endLineNumber: number;
		endColumn: number;
	};
	scrollPosition?: {
		scrollTop: number;
	};
	viewState?: Record<string, unknown>;
}

export interface MonacoModel {
	id: string;
	workspace: string;
	path: string;
	language: string;
	content: string;
	state?: ModelState;
}
