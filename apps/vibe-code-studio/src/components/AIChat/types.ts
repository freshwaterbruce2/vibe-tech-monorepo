/**
 * AIChat Types
 * Type definitions for the AI Chat component
 */
import type { FileChange, MultiFileEditPlan } from '@vibetech/types/multifile';
import type { ReactElement, ReactNode } from 'react';
import type { AIMessage, AgentStep, AgentTask, ApprovalRequest, StepStatus } from '../../types';

export type ChatMode = 'chat' | 'agent';

export interface WorkspaceContext {
    workspaceRoot: string;
    currentFile?: string;
    openFiles: string[];
    recentFiles: string[];
}

export interface AIChatProps {
    messages: AIMessage[];
    onSendMessage: (message: string) => void;
    onClose: () => void;
    showReasoningProcess?: boolean | undefined;
    currentModel?: string | undefined;
    mode?: ChatMode;
    onModeChange?: (mode: ChatMode) => void;
    // Agent mode integration
    taskPlanner?: any; // TaskPlanner instance
    executionEngine?: any; // ExecutionEngine instance
    workspaceContext?: WorkspaceContext;
    // Message management for Agent Mode
    onAddMessage?: (message: AIMessage) => void;
    onUpdateMessage?: (messageId: string, updater: (msg: AIMessage) => AIMessage) => void;
    // Callbacks for agent actions
    onFileChanged?: (filePath: string, action: 'created' | 'modified' | 'deleted') => void;
    onTaskComplete?: (task: AgentTask) => void;
    onTaskError?: (task: AgentTask, error: Error) => void;
    onApprovalRequired?: (step: AgentStep, request: ApprovalRequest) => Promise<boolean>;
    // Multi-file edit detection
    onMultiFileEditDetected?: (plan: MultiFileEditPlan, changes: FileChange[]) => void;
}

export interface MemoizedStepCardProps {
    step: AgentStep;
    pendingApproval: ApprovalRequest | null;
    getStepIcon: (status: StepStatus) => ReactElement;
    handleApproval?: (stepId: string, approved: boolean) => void;
}

export interface MessageItemProps {
    message: AIMessage;
    showReasoningProcess: boolean;
    onCopy: (text: string) => void;
    onFeedback?: (messageId: string, feedback: 'positive' | 'negative') => void;
    renderAgentTask: (message: AIMessage) => ReactNode;
}

export interface ModeInfo {
    title: string;
    description: string;
}

export const MIN_WIDTH = 380;
export const MAX_WIDTH = 800;
export const DEFAULT_WIDTH = 380;
