/**
 * EnhancedAgentMode Module Exports
 * Barrel file for Enhanced Agent Mode component
 */

// Main component
export { EnhancedAgentMode, default } from './EnhancedAgentMode';

// Types
export type {
    AgentInfo,
    EnhancedAgentModeProps,
    LogEntry,
    LogEntryType,
    LogMetrics,
    TaskStatus,
    WorkspaceContextInfo
} from './types';

// Styled components (for advanced customization)
export {
    ActionButton,
    AgentCard,
    Backdrop,
    Container,
    ExecutionLog,
    Footer,
    Header,
    LogEntryStyled,
    MainContent,
    PerformanceMetric,
    ProgressIndicator,
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarSection,
    StatusIndicator,
    StatusSection,
    TaskInput,
    TaskSection,
    TaskTextarea,
    Title
} from './styled';

// Hooks
export { useAgentTask } from './useAgentTask';
