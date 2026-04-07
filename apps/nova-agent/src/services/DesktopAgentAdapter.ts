
import { BaseAgentAdapter } from '@vibetech/shared';
import type { ProjectInfo, AgentState, WebSearchResult } from '@vibetech/shared';
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

    async sendIpcMessage(message: Record<string, unknown>): Promise<void> {
        return AgentService.sendIpcMessage(message);
    }
}
