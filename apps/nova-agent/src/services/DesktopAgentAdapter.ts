
import { BaseAgentAdapter } from '@nova/core/abstraction/AgentAdapter';
import type { ProjectInfo } from '@nova/core/abstraction/AgentAdapter';
import type { AgentState, WebSearchResult } from '@nova/types';
import { AgentService } from './AgentService';

export class DesktopAgentAdapter extends BaseAgentAdapter {
    async chat(message: string, projectId?: string): Promise<string> {
        return AgentService.chat(message, projectId);
    }

    async getStatus(): Promise<AgentState> {
        return AgentService.getStatus();
    }

    async searchWeb(query: string): Promise<WebSearchResult[]> {
        return AgentService.searchWeb(query);
    }

    async updateCapabilities(capabilities: string[]): Promise<void> {
        return AgentService.updateCapabilities(capabilities);
    }

    async searchMemories(query: string): Promise<string[]> {
        return AgentService.searchMemories(query);
    }

    async listProjects(): Promise<ProjectInfo[]> {
        return AgentService.listProjects();
    }

    async getProjectState(projectPath: string): Promise<unknown> {
        return AgentService.getProjectState(projectPath);
    }

    async sendIpcMessage(message: any): Promise<void> {
        return AgentService.sendIpcMessage(message);
    }
}
