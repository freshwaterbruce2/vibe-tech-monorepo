/**
 * Composer Mode - Multi-file editing interface inspired by Cursor's Composer
 */
import React, { useRef, useState } from 'react';
import { Editor as MonacoEditor } from '@monaco-editor/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Code,
  FileSearch,
  FileText,
  GitBranch,
  Layers,
  Plus,
  Send,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';

import type { UnifiedAIService } from '../../../services/ai/UnifiedAIService';
import { logger } from '../../../services/Logger';
import { vibeTheme } from '../../../styles/theme';

import type { ComposerFile, ComposerModeProps } from './ComposerMode.types';
import {
  ComposerBackdrop,
  ComposerContainer,
  ComposerHeader,
  ComposerTitle,
  ComposerActions,
  ActionButton,
  ComposerBody,
  FileList,
  FileListHeader,
  FileItem,
  EditorSection,
  EditorHeader,
  EditorContainer,
  EditorToolbar,
  PromptSection,
  PromptInput,
  ContextTags,
  ContextTag,
  StatusBar,
} from './ComposerMode.styles';

export const ComposerMode = ({
  isOpen,
  onClose,
  onApplyChanges,
  initialFiles = [],
  workspaceContext,
  // currentModel,
  aiService,
}: ComposerModeProps) => {
  const [files, setFiles] = useState<ComposerFile[]>(initialFiles);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedFile = files.find(f => f.id === selectedFileId);

  const handleAddFile = () => {
    const newFile: ComposerFile = {
      id: Date.now().toString(),
      path: 'untitled.ts',
      content: '',
      originalContent: '',
      language: 'typescript',
      isDirty: true,
      isNew: true,
    };
    setFiles([...files, newFile]);
    setSelectedFileId(newFile.id);
  };

  const handleLoadWorkspaceFiles = () => {
    if (!workspaceContext?.openFiles) {return;}
    
    const workspaceFiles = workspaceContext.openFiles.slice(0, 5).map(filePath => ({
      id: filePath,
      path: filePath.split('/').pop() ?? filePath,
      content: `// Content from ${filePath}\n// This is a placeholder - in a real implementation,\n// this would load the actual file content`,
      originalContent: `// Content from ${filePath}\n// This is a placeholder - in a real implementation,\n// this would load the actual file content`,
      language: getLanguageFromPath(filePath),
      isDirty: false,
      isNew: false,
    }));
    
    setFiles([...files, ...workspaceFiles]);
    if (workspaceFiles.length > 0) {
      setSelectedFileId(workspaceFiles[0]?.id ?? null);
    }
  };

  const getLanguageFromPath = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      js: 'javascript',
      ts: 'typescript',
      jsx: 'javascript',
      tsx: 'typescript',
      py: 'python',
      css: 'css',
      html: 'html',
      json: 'json',
      md: 'markdown',
    };
    return languageMap[ext ?? ''] ?? 'plaintext';
  };

  const handleRemoveFile = (fileId: string) => {
    setFiles(files.filter(f => f.id !== fileId));
    if (selectedFileId === fileId) {
      setSelectedFileId(files[0]?.id ?? null);
    }
  };

  const handleSendPrompt = async () => {
    if (!prompt.trim() || !aiService) {return;}

    setIsProcessing(true);

    try {
      // Build context from current files
      const fileContext = files.map(f => `File: ${f.path}\n\`\`\`${f.language}\n${f.content}\n\`\`\``).join('\n\n');

      const enhancedPrompt = `You are an AI assistant helping with multi-file code editing.
The user will describe changes they want to make across multiple files.
Analyze the request and generate the modified code for each file.

Current files context:
${fileContext}

User request: ${prompt}

Please provide the updated code for each file in separate code blocks with the language specified.`;

      // Get AI response using UnifiedAIService
      const response = await aiService.sendContextualMessage({
        userQuery: enhancedPrompt,
        currentFile: undefined,
        relatedFiles: [],
        workspaceContext: {
          rootPath: '',
          totalFiles: files.length,
          languages: [...new Set(files.map(f => f.language))],
          testFiles: 0,
          projectStructure: {},
          dependencies: {},
          exports: {},
          symbols: {},
          lastIndexed: new Date(),
          summary: `Composer Mode: ${files.length} files being edited`
        },
        conversationHistory: []
      });
      
      // Parse response to extract file changes
      // Simple parsing - in production would use more sophisticated parsing
      const codeBlocks = response.content.match(/```[\s\S]*?```/g) ?? [];
      
      if (codeBlocks.length > 0) {
        const updatedFiles = files.map((file, index) => {
          if (index < codeBlocks.length) {
            const newContent = codeBlocks[index]!
              .replace(/```\w*\n?/, '')
              .replace(/```$/, '')
              .trim();
            
            return {
              ...file,
              content: newContent,
              isDirty: newContent !== file.originalContent
            };
          }
          return file;
        });
        
        setFiles(updatedFiles);
      }
      
      // Add a new file if the AI suggests creating one
      if (response.content.includes('create new file') || response.content.includes('add a new file')) {
        handleAddFile();
      }
      
    } catch (error) {
      logger.error('Error processing AI request:', error);
    } finally {
      setIsProcessing(false);
      setPrompt('');
    }
  };

  const handleApplyChanges = () => {
    onApplyChanges(files.filter(f => f.isDirty));
    onClose();
  };

  const dirtyFileCount = files.filter(f => f.isDirty).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <ComposerBackdrop
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onClose();
            }
          }}
        >
          <ComposerContainer
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            $expanded={isExpanded}
            onClick={(e) => e.stopPropagation()}
          >
          <ComposerHeader>
            <ComposerTitle>
              <Layers />
              <h2>Composer Mode</h2>
              {dirtyFileCount > 0 && (
                <span style={{ color: vibeTheme.colors.warning, fontSize: '14px' }}>
                  {dirtyFileCount} file{dirtyFileCount > 1 ? 's' : ''} modified
                </span>
              )}
            </ComposerTitle>
            <ComposerActions>
              <ActionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <ChevronDown /> : <ChevronRight />}
                {isExpanded ? 'Collapse' : 'Expand'}
              </ActionButton>
              <ActionButton
                $primary
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleApplyChanges}
                disabled={dirtyFileCount === 0}
              >
                <Check />
                Apply Changes
              </ActionButton>
              <ActionButton
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={onClose}
              >
                <X />
              </ActionButton>
            </ComposerActions>
          </ComposerHeader>

          <ComposerBody>
            <FileList>
              <FileListHeader>
                <h3>FILES ({files.length})</h3>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {workspaceContext?.openFiles && workspaceContext.openFiles.length > 0 && (
                    <ActionButton 
                      onClick={handleLoadWorkspaceFiles}
                      title="Load workspace files"
                    >
                      <Code size={16} />
                    </ActionButton>
                  )}
                  <ActionButton onClick={handleAddFile} title="Add new file">
                    <Plus size={16} />
                  </ActionButton>
                </div>
              </FileListHeader>
              {files.map(file => (
                <FileItem
                  key={file.id}
                  $selected={selectedFileId === file.id}
                  $isDirty={file.isDirty}
                  onClick={() => setSelectedFileId(file.id)}
                  whileHover={{ x: 4 }}
                >
                  <FileText />
                  <span className="file-name">{file.path}</span>
                  <div className="file-status">
                    {file.isDirty && <div className="dot" />}
                    {file.isNew && (
                      <span style={{ fontSize: '11px', color: vibeTheme.colors.success }}>NEW</span>
                    )}
                  </div>
                </FileItem>
              ))}
            </FileList>

            <EditorSection>
              {selectedFile ? (
                <>
                  <EditorHeader>
                    <span className="file-path">{selectedFile.path}</span>
                    <ActionButton onClick={() => handleRemoveFile(selectedFile.id)}>
                      <X size={16} />
                    </ActionButton>
                  </EditorHeader>
                  <EditorContainer>
                    <EditorToolbar>
                      <div className="editor-info">
                        <span>{selectedFile.language.toUpperCase()}</span>
                        <span>•</span>
                        <span>{selectedFile.content.split('\n').length} lines</span>
                        <span>•</span>
                        <span>{selectedFile.content.length} chars</span>
                        {selectedFile.isDirty && (
                          <>
                            <span>•</span>
                            <span style={{ color: vibeTheme.colors.warning }}>Modified</span>
                          </>
                        )}
                      </div>
                      <div className="editor-actions">
                        <ActionButton onClick={() => {
                          const updatedFiles = files.map(f => 
                            f.id === selectedFile.id 
                              ? { ...f, content: f.originalContent, isDirty: false }
                              : f
                          );
                          setFiles(updatedFiles);
                        }}>
                          Reset
                        </ActionButton>
                      </div>
                    </EditorToolbar>
                    <div style={{ flex: 1 }}>
                      <MonacoEditor
                        language={selectedFile.language}
                        value={selectedFile.content}
                        onChange={(value) => {
                          const updatedFiles = files.map(f => 
                            f.id === selectedFile.id 
                              ? { ...f, content: value ?? '', isDirty: value !== f.originalContent }
                              : f
                          );
                          setFiles(updatedFiles);
                        }}
                        theme="vs-dark"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 14,
                          lineNumbers: 'on',
                          scrollBeyondLastLine: false,
                          wordWrap: 'on',
                          automaticLayout: true,
                          folding: true,
                          renderWhitespace: 'selection',
                          bracketPairColorization: { enabled: true },
                          tabSize: 2,
                          insertSpaces: true,
                        }}
                      />
                    </div>
                  </EditorContainer>
                </>
              ) : (
                <div style={{ 
                  flex: 1, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: vibeTheme.colors.textSecondary
                }}>
                  Select a file or add a new one to begin editing
                </div>
              )}
            </EditorSection>
          </ComposerBody>

          <PromptSection>
            <ContextTags>
              {workspaceContext?.gitBranch && (
                <ContextTag whileHover={{ scale: 1.05 }}>
                  <GitBranch />
                  {workspaceContext.gitBranch}
                </ContextTag>
              )}
              <ContextTag whileHover={{ scale: 1.05 }}>
                <Code />
                {files.length} files
              </ContextTag>
              <ContextTag whileHover={{ scale: 1.05 }}>
                <Clock />
                Real-time editing
              </ContextTag>
            </ContextTags>
            <PromptInput>
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={files.length === 0 
                  ? "Add files first, then describe what you want to build or change across multiple files..."
                  : "Describe the changes you want to make across multiple files...\n\nExamples:\n• Add TypeScript types to all files\n• Refactor components to use hooks\n• Add error handling to API calls\n• Create tests for all functions"
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleSendPrompt();
                  }
                }}
                style={{ minHeight: '80px' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <ActionButton
                  $primary
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSendPrompt}
                  disabled={!prompt.trim() || isProcessing || files.length === 0}
                >
                  {isProcessing ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <Sparkles size={16} />
                    </motion.div>
                  ) : (
                    <Send size={16} />
                  )}
                </ActionButton>
                <div style={{ fontSize: '11px', color: vibeTheme.colors.textMuted, textAlign: 'center' }}>
                  Ctrl+Enter
                </div>
              </div>
            </PromptInput>
          </PromptSection>

          <StatusBar>
            <div className="status-item">
              <Zap />
              Ready
            </div>
            <div className="status-item">
              <FileSearch />
              Context aware
            </div>
            <div className="status-item">
              <Sparkles />
              AI powered
            </div>
          </StatusBar>
          </ComposerContainer>
        </ComposerBackdrop>
      )}
    </AnimatePresence>
  );
};

export default ComposerMode;