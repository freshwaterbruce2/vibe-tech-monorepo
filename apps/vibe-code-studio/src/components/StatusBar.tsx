import {
  Activity,
  AlertCircle,
  CheckCircle,
  GitBranch,
  ImageIcon,
  Layers,
  MessageCircle,
  Package,
  Sidebar,
  Sparkles,
  Terminal,
  Zap,
} from 'lucide-react';
import { memo, useMemo } from 'react';

import { useGit } from '../hooks/useGit';
import { countBySeverity, flattenDiagnostics, useProblemsStore } from '../stores/problemsStore';
import { vibeTheme } from '../styles/theme';
import type { EditorFile } from '../types';

import {
  LeftSection,
  RightSection,
  Separator,
  StatusBarContainer,
  StatusItem,
  ToggleButton,
} from './StatusBar.styles';

interface StatusBarProps {
  currentFile: EditorFile | null;
  aiChatOpen: boolean;
  backgroundPanelOpen?: boolean;
  sidebarOpen?: boolean;
  activeVisualPanel?: string;
  terminalOpen?: boolean;
  agentModeOpen?: boolean;
  agentManagerOpen?: boolean;
  currentModel?: string;
  onGitClick?: () => void;
  onToggleSidebar: () => void;
  onToggleAIChat: () => void;
  onToggleBackgroundPanel?: () => void;
  onOpenAgentManager?: () => void;
  onOpenAgentMode?: () => void;
  onOpenTerminal?: () => void;
  onToggleScreenshot?: () => void;
  onToggleLibrary?: () => void;
  onToggleVisualEditor?: () => void;
}

const StatusBar = ({
  currentFile,
  aiChatOpen,
  backgroundPanelOpen,
  sidebarOpen = true,
  activeVisualPanel = 'none',
  terminalOpen = false,
  agentModeOpen = false,
  agentManagerOpen = false,
  currentModel,
  onGitClick,
  onToggleSidebar,
  onToggleAIChat,
  onToggleBackgroundPanel,
  onOpenAgentManager,
  onOpenAgentMode,
  onOpenTerminal,
  onToggleScreenshot,
  onToggleLibrary,
  onToggleVisualEditor,
}: StatusBarProps) => {
  const { isGitRepo, status, branches } = useGit();
  const bySource = useProblemsStore(state => state.bySource);
  const setProblemsPanelOpen = useProblemsStore(state => state.actions.setPanelOpen);

  // Real diagnostics count from the shared problems store (task runner / LSP).
  const diagnosticCounts = useMemo(() => countBySeverity(flattenDiagnostics(bySource)), [bySource]);
  const { error: errorCount, warning: warningCount } = diagnosticCounts;
  const hasProblems = errorCount > 0 || warningCount > 0;
  const problemsLabel = hasProblems
    ? `${errorCount} error${errorCount === 1 ? '' : 's'}, ` +
      `${warningCount} warning${warningCount === 1 ? '' : 's'}`
    : 'No errors';

  // Format model name for compact display (e.g. "moonshot/kimi-2.5-pro" → "Kimi 2.5 Pro")
  const modelLabel = (() => {
    if (!currentModel) return 'AI Ready';
    const name = currentModel.split('/').pop() ?? currentModel;
    return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  })();

  const getFileInfo = () => {
    if (!currentFile) {
      return null;
    }

    const lines = currentFile.content.split('\n').length;
    const characters = currentFile.content.length;
    const words = currentFile.content.split(/\s+/).filter(word => word.length > 0).length;

    return { lines, characters, words };
  };

  const fileInfo = getFileInfo();
  const currentBranch = branches.find(b => b.isCurrent);
  const gitChanges =
    (status?.modified.length ?? 0) +
    (status?.added.length ?? 0) +
    (status?.deleted.length ?? 0) +
    (status?.untracked.length ?? 0);

  return (
    <StatusBarContainer>
      <LeftSection>
        {isGitRepo && (
          <StatusItem
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onGitClick}
            title={`Current branch: ${currentBranch?.name ?? 'detached'} — open Source Control`}
          >
            <GitBranch size={14} />
            {currentBranch?.name ?? 'detached'}
            {gitChanges > 0 && (
              <span style={{ marginLeft: '4px', color: vibeTheme.colors.cyan }}>+{gitChanges}</span>
            )}
          </StatusItem>
        )}

        <StatusItem
          whileHover={{ scale: 1.05, y: -1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setProblemsPanelOpen(true)}
          title="Open Problems panel"
        >
          {hasProblems ? (
            <AlertCircle size={14} style={{ color: vibeTheme.colors.error }} />
          ) : (
            <CheckCircle size={14} />
          )}
          {problemsLabel}
        </StatusItem>

        {currentFile && (
          <>
            <Separator />
            <StatusItem whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.95 }}>
              {currentFile.language.toUpperCase()}
            </StatusItem>

            {fileInfo && (
              <StatusItem whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.95 }}>
                Ln {fileInfo.lines}, Col 1 | {fileInfo.characters} chars | {fileInfo.words} words
              </StatusItem>
            )}

            {currentFile.isModified && (
              <StatusItem whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.95 }}>
                <AlertCircle size={14} />
                Unsaved changes
              </StatusItem>
            )}
          </>
        )}
      </LeftSection>

      <RightSection>
        <StatusItem whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.95 }}>
          <Zap size={14} />
          {modelLabel}
        </StatusItem>

        <Separator />

        {onToggleScreenshot && (
          <ToggleButton
            active={activeVisualPanel === 'screenshot'}
            onClick={onToggleScreenshot}
            data-testid="status-screenshot-toggle"
            title="Screenshot to Code"
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
          >
            <ImageIcon size={14} />
            Screenshot
          </ToggleButton>
        )}

        {onToggleLibrary && (
          <ToggleButton
            active={activeVisualPanel === 'library'}
            onClick={onToggleLibrary}
            data-testid="status-library-toggle"
            title="Component Library"
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Package size={14} />
            Library
          </ToggleButton>
        )}

        {onToggleVisualEditor && (
          <ToggleButton
            active={activeVisualPanel === 'visual'}
            onClick={onToggleVisualEditor}
            data-testid="status-visual-editor-toggle"
            title="Visual Editor"
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Layers size={14} />
            Visual
          </ToggleButton>
        )}

        {onOpenAgentMode && (
          <ToggleButton
            active={agentModeOpen}
            onClick={onOpenAgentMode}
            data-testid="status-review-agents-toggle"
            title={`Open Multi-Agent Review (${currentModel ?? 'selected model'})`}
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Sparkles size={14} />
            Review Agents
          </ToggleButton>
        )}

        {onOpenTerminal && (
          <ToggleButton
            active={terminalOpen}
            onClick={onOpenTerminal}
            data-testid="status-terminal-toggle"
            title="Open Terminal"
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Terminal size={14} />
            Terminal
          </ToggleButton>
        )}

        {onOpenAgentManager && (
          <ToggleButton
            active={agentManagerOpen}
            onClick={onOpenAgentManager}
            data-testid="status-tasks-toggle"
            title="Open Agent Manager (background agents + inbox)"
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Activity size={14} />
            Tasks
          </ToggleButton>
        )}

        {onToggleBackgroundPanel && (
          <ToggleButton
            active={backgroundPanelOpen ?? false}
            onClick={onToggleBackgroundPanel}
            data-testid="status-legacy-tasks-toggle"
            title="Toggle Legacy Background Tasks"
            whileHover={{ scale: 1.05, y: -1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Activity size={14} />
            Legacy Tasks
          </ToggleButton>
        )}

        <ToggleButton
          active={aiChatOpen}
          onClick={onToggleAIChat}
          data-testid="status-chat-agent-toggle"
          title="Open Chat Agent coding executor"
          whileHover={{ scale: 1.05, y: -1 }}
          whileTap={{ scale: 0.95 }}
        >
          <MessageCircle size={14} />
          Chat Agent
        </ToggleButton>

        <ToggleButton
          active={sidebarOpen}
          onClick={onToggleSidebar}
          data-testid="status-sidebar-toggle"
          title="Toggle Sidebar"
          aria-label="Toggle sidebar"
          whileHover={{ scale: 1.05, y: -1 }}
          whileTap={{ scale: 0.95 }}
        >
          <Sidebar size={14} />
        </ToggleButton>
      </RightSection>
    </StatusBarContainer>
  );
};

export default memo(StatusBar);
