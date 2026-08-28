// Types previously from @nova/types — inlined to remove dead package dependency

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}

export interface AgentState {
    active_conversations: string[];
    memory_count: number;
    capabilities: string[];
    current_project: string | null;
    ipc_connected: boolean;
    active_model: string;
    chat_history: ChatMessage[];
}

export interface WebSearchResult {
    title: string;
    link: string;
    snippet?: string;
}

export interface ProjectInfo {
    id: string;
    name: string;
    path: string;
    project_type: string;
    has_state: boolean;
}

export interface IAgentAdapter {
    chat(message: string, projectId?: string): Promise<string>;
    getStatus(): Promise<AgentState>;
    searchWeb(query: string): Promise<WebSearchResult[]>;
    updateCapabilities(capabilities: string[]): Promise<void>;
    searchMemories(query: string): Promise<string[]>;
    listProjects(): Promise<ProjectInfo[]>;
    getProjectState(projectPath: string): Promise<unknown>;
    // Generic IPC for extensible commands
    sendIpcMessage(message: Record<string, unknown>): Promise<void>;
}

export abstract class BaseAgentAdapter implements IAgentAdapter {
    abstract chat(message: string, projectId?: string): Promise<string>;
    abstract getStatus(): Promise<AgentState>;
    abstract searchWeb(query: string): Promise<WebSearchResult[]>;
    abstract updateCapabilities(capabilities: string[]): Promise<void>;
    abstract searchMemories(query: string): Promise<string[]>;
    abstract listProjects(): Promise<ProjectInfo[]>;
    abstract getProjectState(projectPath: string): Promise<unknown>;
    abstract sendIpcMessage(message: Record<string, unknown>): Promise<void>;
}
