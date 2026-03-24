/**
 * MultiFileEditApprovalPanel - UI for approving/rejecting multi-file changes
 * Shows diff preview with Monaco DiffEditor, allows selective file approval
 */
import { DiffEditor } from '@monaco-editor/react';
import type { FileChange, MultiFileEditPlan } from '@vibetech/types/multifile';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronRight, FileText, Minus, Plus, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import styled from 'styled-components';

import { vibeTheme } from '../styles/theme';

// Modal overlay backdrop
const ModalOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 40px;
`;

// Centered modal container (upgraded from side panel)
const PanelContainer = styled(motion.div)`
  width: 100%;
  max-width: 1400px;
  max-height: 90vh;
  background: ${vibeTheme.colors.secondary};
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: ${vibeTheme.borderRadius.lg};
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4), 0 0 40px rgba(139, 92, 246, 0.15);
  overflow: hidden;
`;

const Header = styled.div`
  padding: 16px 20px;
  background: ${vibeTheme.colors.elevated};
  border-bottom: 1px solid ${vibeTheme.colors.border};
`;

const Title = styled.h3`
  margin: 0 0 8px 0;
  color: ${vibeTheme.colors.text};
  font-size: ${vibeTheme.typography.fontSize.lg};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
`;

const Description = styled.p`
  margin: 0;
  color: ${vibeTheme.colors.textSecondary};
  font-size: ${vibeTheme.typography.fontSize.sm};
`;

// FileList replaced by FileListPanel in new layout

const FileItem = styled.div<{ $selected: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 8px;
  background: ${props => props.$selected
    ? 'rgba(139, 92, 246, 0.1)'
    : vibeTheme.colors.elevated};
  border: 1px solid ${props => props.$selected
    ? 'rgba(139, 92, 246, 0.3)'
    : vibeTheme.colors.border};
  border-radius: ${vibeTheme.borderRadius.md};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(139, 92, 246, 0.15);
    border-color: rgba(139, 92, 246, 0.4);
  }
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: ${vibeTheme.accent};
`;

const FileName = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${vibeTheme.colors.text};
  font-size: ${vibeTheme.typography.fontSize.sm};
  font-family: ${vibeTheme.typography.fontFamily.mono};
`;

const DiffStats = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: ${vibeTheme.typography.fontSize.sm};
  font-family: ${vibeTheme.typography.fontFamily.mono};
`;

const DiffAdded = styled.span`
  color: #22c55e;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const DiffRemoved = styled.span`
  color: #ef4444;
  display: flex;
  align-items: center;
  gap: 4px;
`;

// Per-file action buttons
const FileActionButton = styled.button<{ $variant: 'accept' | 'reject' }>`
  padding: 4px 8px;
  border-radius: ${vibeTheme.borderRadius.sm};
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: ${vibeTheme.typography.fontSize.xs};
  transition: all 0.15s ease;
  background: ${props => props.$variant === 'accept'
    ? 'rgba(34, 197, 94, 0.1)'
    : 'rgba(239, 68, 68, 0.1)'};
  color: ${props => props.$variant === 'accept' ? '#22c55e' : '#ef4444'};
  border: 1px solid ${props => props.$variant === 'accept'
    ? 'rgba(34, 197, 94, 0.3)'
    : 'rgba(239, 68, 68, 0.3)'};

  &:hover {
    background: ${props => props.$variant === 'accept'
      ? 'rgba(34, 197, 94, 0.2)'
      : 'rgba(239, 68, 68, 0.2)'};
    transform: scale(1.05);
  }
`;

const FileActions = styled.div`
  display: flex;
  gap: 4px;
  margin-left: auto;
`;

// DiffPreview and DiffLine replaced by Monaco DiffEditor

// Content area with horizontal split
const ContentWrapper = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
`;

// Left panel for file list
const FileListPanel = styled.div`
  width: 400px;
  min-width: 300px;
  border-right: 1px solid ${vibeTheme.colors.border};
  overflow-y: auto;
  padding: 12px;
`;

// Right panel for Monaco diff editor
const DiffPanel = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: ${vibeTheme.colors.primary};
`;

const DiffPanelHeader = styled.div`
  padding: 12px 16px;
  background: ${vibeTheme.colors.elevated};
  border-bottom: 1px solid ${vibeTheme.colors.border};
  font-family: ${vibeTheme.typography.fontFamily.mono};
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.textSecondary};
`;

const MonacoContainer = styled.div`
  flex: 1;
  min-height: 200px;
`;

const Actions = styled.div`
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  background: ${vibeTheme.colors.elevated};
  border-top: 1px solid ${vibeTheme.colors.border};
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  flex: 1;
  padding: 12px 24px;
  background: ${props => props.$variant === 'primary'
    ? vibeTheme.gradients.primary
    : 'transparent'};
  color: ${props => props.$variant === 'primary'
    ? vibeTheme.colors.text
    : vibeTheme.colors.textSecondary};
  border: 1px solid ${props => props.$variant === 'primary'
    ? 'transparent'
    : vibeTheme.colors.border};
  border-radius: ${vibeTheme.borderRadius.md};
  font-weight: ${vibeTheme.typography.fontWeight.medium};
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(139, 92, 246, 0.3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const EmptyState = styled.div`
  padding: 40px 20px;
  text-align: center;
  color: ${vibeTheme.colors.textSecondary};
`;

interface MultiFileEditApprovalPanelProps {
  plan: MultiFileEditPlan;
  changes: FileChange[];
  onApply: (selectedFiles: string[]) => void;
  onReject: () => void;
  onAcceptFile?: (path: string) => void;
  onRejectFile?: (path: string) => void;
}

// Language detection for Monaco syntax highlighting
const getLanguageFromPath = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const langMap: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    json: 'json',
    md: 'markdown',
    css: 'css',
    scss: 'scss',
    html: 'html',
    py: 'python',
    rs: 'rust',
    go: 'go',
    yaml: 'yaml',
    yml: 'yaml',
  };
  return langMap[ext] ?? 'plaintext';
};

export const MultiFileEditApprovalPanel = ({
  plan,
  changes,
  onApply,
  onReject,
  onAcceptFile,
  onRejectFile,
}: MultiFileEditApprovalPanelProps) => {
  // All files selected by default
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(
    new Set(changes.map(c => c.path))
  );
  const [previewFile, setPreviewFile] = useState<string | null>(
    changes.length > 0 ? changes[0]!.path : null
  );

  const toggleFile = (path: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    setSelectedFiles(newSelected);
  };

  const calculateDiffStats = (change: FileChange) => {
    const lines = change.diff?.split('\n') ?? [];
    const added = lines.filter((l: string) => l.startsWith('+')).length;
    const removed = lines.filter((l: string) => l.startsWith('-')).length;
    return { added, removed };
  };

  // Get the currently selected file's change data
  const previewChange = useMemo(() =>
    changes.find(c => c.path === previewFile),
    [changes, previewFile]
  );
  // Monaco editor theme options
  const editorOptions = useMemo(() => ({
    readOnly: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    renderSideBySide: true,
    fontSize: 13,
    lineNumbers: 'on' as const,
    glyphMargin: false,
    folding: true,
    lineDecorationsWidth: 0,
    lineNumbersMinChars: 4,
  }), []);

  return (
    <AnimatePresence>
      <ModalOverlay
        data-testid="multi-file-approval"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onReject}
      >
        <PanelContainer
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Header>
            <Title>Multi-File Changes ({changes.length} files)</Title>
            <Description>{plan.description}</Description>
          </Header>

          <ContentWrapper>
            <FileListPanel>
              {changes.map(change => {
                const { added, removed } = calculateDiffStats(change);
                const isSelected = selectedFiles.has(change.path);
                const isActive = change.path === previewFile;

                return (
                  <FileItem
                    key={change.path}
                    $selected={isActive}
                    onClick={() => setPreviewFile(change.path)}
                  >
                    <Checkbox
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleFile(change.path)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <FileName>
                      <FileText size={16} />
                      {change.path.split('/').pop()}
                    </FileName>
                    <DiffStats>
                      {added > 0 && (
                        <DiffAdded>
                          <Plus size={14} />
                          {added}
                        </DiffAdded>
                      )}
                      {removed > 0 && (
                        <DiffRemoved>
                          <Minus size={14} />
                          {removed}
                        </DiffRemoved>
                      )}
                    </DiffStats>
                    {(onAcceptFile || onRejectFile) && (
                      <FileActions>
                        {onAcceptFile && (
                          <FileActionButton
                            $variant="accept"
                            data-testid="accept-file-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onAcceptFile(change.path);
                            }}
                            title="Accept this file"
                          >
                            <Check size={12} />
                          </FileActionButton>
                        )}
                        {onRejectFile && (
                          <FileActionButton
                            $variant="reject"
                            data-testid="reject-file-button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRejectFile(change.path);
                            }}
                            title="Reject this file"
                          >
                            <X size={12} />
                          </FileActionButton>
                        )}
                      </FileActions>
                    )}
                    <ChevronRight size={16} opacity={0.5} />
                  </FileItem>
                );
              })}
            </FileListPanel>

            <DiffPanel>
              {previewChange ? (
                <>
                  <DiffPanelHeader>
                    {previewChange.path}
                  </DiffPanelHeader>
                  <MonacoContainer>
                    <DiffEditor
                      height="100%"
                      language={getLanguageFromPath(previewChange.path)}
                      original={previewChange.originalContent ?? ''}
                      modified={previewChange.newContent ?? ''}
                      theme="vs-dark"
                      options={editorOptions}
                    />
                  </MonacoContainer>
                </>
              ) : (
                <EmptyState>Select a file to preview changes</EmptyState>
              )}
            </DiffPanel>
          </ContentWrapper>

          <Actions>
            <Button $variant="secondary" onClick={onReject} data-testid="reject-button">
              <X size={18} />
              Reject All
            </Button>
            <Button
              $variant="primary"
              onClick={() => onApply(Array.from(selectedFiles))}
              disabled={selectedFiles.size === 0}
              data-testid="apply-button"
            >
              <Check size={18} />
              Apply Selected ({selectedFiles.size})
            </Button>
          </Actions>
        </PanelContainer>
      </ModalOverlay>
    </AnimatePresence>
  );
};
