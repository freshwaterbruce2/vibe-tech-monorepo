/**
 * Composer Mode - Multi-file editing interface inspired by Cursor's Composer
 */
import { useRef, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Layers,
  Sparkles,
  X,
  Zap,
  FileSearch,
} from 'lucide-react';

import type { UnifiedAIService } from '../../services/ai/UnifiedAIService';
import { ElectronService } from '../../services/ElectronService';
import { logger } from '../../services/Logger';
import type { ComposerFile, ComposerWorkspaceContext } from './ComposerMode.types';
import { 
  ComposerBackdrop,
  ComposerContainer,
  ComposerHeader,
  ComposerTitle,
  ComposerActions,
  ActionButton,
  ComposerBody,
  StatusBar,
  ComposerTitleWarning
} from './ComposerMode.styles';
import { ComposerFileList } from './ComposerFileList';
import { ComposerEditor } from './ComposerEditor';
import { ComposerPrompt } from './ComposerPrompt';

interface ComposerModeProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyChanges: (files: ComposerFile[]) => void;
  initialFiles?: ComposerFile[];
  workspaceContext?: ComposerWorkspaceContext;
  currentModel?: string;
  aiService?: UnifiedAIService;
}

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

  const handleLoadWorkspaceFiles = async () => {
    if (!workspaceContext?.openFiles) {return;}

    const electronService = new ElectronService();
    const filePaths = workspaceContext.openFiles.slice(0, 5);

    const loadedFiles = await Promise.all(
      filePaths.map(async (filePath): Promise<ComposerFile> => {
        let content = '';
        try {
          content = await electronService.readFile(filePath);
        } catch (error) {
          logger.warn(`[ComposerMode] Failed to read file "${filePath}":`, error);
          content = `// Failed to load content from ${filePath}\n// Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
        return {
          id: filePath,
          path: filePath.split('/').pop() ?? filePath,
          content,
          originalContent: content,
          language: getLanguageFromPath(filePath),
          isDirty: false,
          isNew: false,
        };
      })
    );

    setFiles([...files, ...loadedFiles]);
    if (loadedFiles.length > 0) {
      setSelectedFileId(loadedFiles[0]?.id ?? null);
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

  const handleChangeFileContent = (fileId: string, content: string) => {
    setFiles(files.map(f => 
      f.id === fileId 
        ? { ...f, content, isDirty: content !== f.originalContent }
        : f
    ));
  };

  const handleResetFileContent = (fileId: string) => {
    setFiles(files.map(f => 
      f.id === fileId 
        ? { ...f, content: f.originalContent, isDirty: false }
        : f
    ));
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
                  <ComposerTitleWarning>
                    {dirtyFileCount} file{dirtyFileCount > 1 ? 's' : ''} modified
                  </ComposerTitleWarning>
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
              <ComposerFileList
                files={files}
                selectedFileId={selectedFileId}
                workspaceContext={workspaceContext}
                onAddFile={handleAddFile}
                onLoadWorkspaceFiles={handleLoadWorkspaceFiles}
                onSelectFile={setSelectedFileId}
              />

              <ComposerEditor
                selectedFile={selectedFile}
                onRemoveFile={handleRemoveFile}
                onChangeFileContent={handleChangeFileContent}
                onResetFileContent={handleResetFileContent}
              />
            </ComposerBody>

            <ComposerPrompt
              files={files}
              workspaceContext={workspaceContext}
              prompt={prompt}
              onPromptChange={setPrompt}
              isProcessing={isProcessing}
              onSendPrompt={handleSendPrompt}
              textareaRef={textareaRef}
            />

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