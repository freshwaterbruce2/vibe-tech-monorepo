import type {
	FileChangeEvent,
	FileWatcher,
	ModelState,
	MonacoModel,
	Workspace,
	WorkspaceConfiguration,
	WorkspaceFolder,
} from "../types/workspace";

export class WorkspaceService {
	private workspaces = new Map<string, Workspace>();
	private activeWorkspaceId: string | null = null;
	private fileWatchers = new Map<string, FileWatcher[]>();
	private monacoModels = new Map<string, MonacoModel>();
	private fileChangeHandlers = new Map<
		string,
		((event: FileChangeEvent) => void)[]
	>();

	createWorkspace(name: string, folders: WorkspaceFolder[] = []): Workspace {
		const id = this.generateId();
		const workspace: Workspace = {
			id,
			name,
			folders: folders.map((f) => ({ ...f })),
			settings: {},
			createdAt: new Date(),
		};

		this.workspaces.set(id, workspace);
		if (this.workspaces.size === 1) {
			this.activeWorkspaceId = id;
		}
		this.initializeFileWatchers(id, folders);
		return workspace;
	}

	getWorkspace(workspaceId: string): Workspace {
		const workspace = this.workspaces.get(workspaceId);
		if (!workspace) throw new Error("Workspace not found");
		return workspace;
	}

	getAllWorkspaces(): Workspace[] {
		return Array.from(this.workspaces.values());
	}

	getActiveWorkspace(): Workspace | null {
		return this.activeWorkspaceId
			? this.getWorkspace(this.activeWorkspaceId)
			: null;
	}

	setActiveWorkspace(workspaceId: string): void {
		if (!this.workspaces.has(workspaceId))
			throw new Error("Workspace not found");
		this.activeWorkspaceId = workspaceId;
	}

	addFolder(workspaceId: string, folder: WorkspaceFolder): void {
		const workspace = this.getWorkspace(workspaceId);
		if (workspace.folders.some((f) => f.path === folder.path)) {
			throw new Error("Folder already exists");
		}
		workspace.folders.push({ ...folder });
		this.addFileWatcher(workspaceId, folder.path);
	}

	removeFolder(workspaceId: string, folderPath: string): void {
		const workspace = this.getWorkspace(workspaceId);
		const index = workspace.folders.findIndex((f) => f.path === folderPath);
		if (index === -1) throw new Error("Folder not found");

		workspace.folders.splice(index, 1);
		this.removeFileWatcher(workspaceId, folderPath);
	}

	getConfiguration(workspaceId: string): WorkspaceConfiguration {
		const workspace = this.getWorkspace(workspaceId);
		return {
			folders: workspace.folders.map((f) => ({ ...f })),
			settings: { ...workspace.settings },
			extensions: { recommendations: [] },
		};
	}

	setFolderSettings(
		workspaceId: string,
		folderPath: string,
		settings: Record<string, unknown>,
	): void {
		const workspace = this.getWorkspace(workspaceId);
		const folder = workspace.folders.find((f) => f.path === folderPath);
		if (!folder) throw new Error("Folder not found");
		folder.settings = { ...folder.settings, ...settings };
	}

	setWorkspaceSettings(
		workspaceId: string,
		settings: Record<string, unknown>,
	): void {
		const workspace = this.getWorkspace(workspaceId);
		workspace.settings = { ...workspace.settings, ...settings };
	}

	getMergedSettings(
		workspaceId: string,
		folderPath: string,
	): Record<string, unknown> {
		const workspace = this.getWorkspace(workspaceId);
		const folder = workspace.folders.find((f) => f.path === folderPath);
		if (!folder) return { ...workspace.settings };
		return { ...workspace.settings, ...folder.settings };
	}

	// ... (Model management methods moved to bottom to shorten)

	createModel(
		workspaceId: string,
		path: string,
		content: string,
		language: string,
	): MonacoModel {
		const id = `${workspaceId}:${path}`;
		const model: MonacoModel = {
			id,
			workspace: workspaceId,
			path,
			language,
			content,
		};
		this.monacoModels.set(id, model);
		return model;
	}

	getModels(workspaceId: string): MonacoModel[] {
		const models: MonacoModel[] = [];
		for (const [_id, model] of this.monacoModels.entries()) {
			if (model.workspace === workspaceId) models.push(model);
		}
		return models;
	}

	setModelState(modelId: string, state: ModelState): void {
		const model = this.monacoModels.get(modelId);
		if (model) model.state = { ...state };
	}

	getModelState(modelId: string): ModelState {
		return this.monacoModels.get(modelId)?.state ?? {};
	}

	dispose(): void {
		for (const workspaceId of this.workspaces.keys())
			this.stopFileWatchers(workspaceId);
		this.monacoModels.clear();
		this.workspaces.clear();
		this.activeWorkspaceId = null;
		this.fileWatchers.clear();
		this.fileChangeHandlers.clear();
	}

	private generateId(): string {
		return `workspace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
	}

	private initializeFileWatchers(
		workspaceId: string,
		folders: WorkspaceFolder[],
	): void {
		const watchers: FileWatcher[] = folders.map((folder) => ({
			path: folder.path,
			workspace: workspaceId,
			active: true,
		}));
		this.fileWatchers.set(workspaceId, watchers);
	}

	private addFileWatcher(workspaceId: string, folderPath: string): void {
		const watchers = this.fileWatchers.get(workspaceId) ?? [];
		watchers.push({ path: folderPath, workspace: workspaceId, active: true });
		this.fileWatchers.set(workspaceId, watchers);
	}

	private removeFileWatcher(workspaceId: string, folderPath: string): void {
		const watchers = this.fileWatchers.get(workspaceId) ?? [];
		this.fileWatchers.set(
			workspaceId,
			watchers.filter((w) => w.path !== folderPath),
		);
	}

	private stopFileWatchers(workspaceId: string): void {
		this.fileWatchers.delete(workspaceId);
		this.fileChangeHandlers.delete(workspaceId);
	}
}
