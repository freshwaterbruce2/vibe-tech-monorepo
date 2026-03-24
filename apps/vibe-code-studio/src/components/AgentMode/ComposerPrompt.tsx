import React from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles, GitBranch, Code, Clock } from 'lucide-react';

import type { ComposerFile, ComposerWorkspaceContext } from './ComposerMode.types';
import { 
  PromptSection, 
  ContextTags, 
  ContextTag, 
  PromptInput, 
  ActionButton,
  PromptActions,
  PromptShortcutHint
} from './ComposerMode.styles';

export interface ComposerPromptProps {
  files: ComposerFile[];
  workspaceContext?: ComposerWorkspaceContext;
  prompt: string;
  onPromptChange: (value: string) => void;
  isProcessing: boolean;
  onSendPrompt: () => void;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export const ComposerPrompt: React.FC<ComposerPromptProps> = ({
  files,
  workspaceContext,
  prompt,
  onPromptChange,
  isProcessing,
  onSendPrompt,
  textareaRef,
}) => {
  return (
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
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder={files.length === 0 
            ? "Add files first, then describe what you want to build or change across multiple files..."
            : "Describe the changes you want to make across multiple files...\n\nExamples:\n• Add TypeScript types to all files\n• Refactor components to use hooks\n• Add error handling to API calls\n• Create tests for all functions"
          }
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              onSendPrompt();
            }
          }}
        />
        <PromptActions>
          <ActionButton
            $primary
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSendPrompt}
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
          <PromptShortcutHint>
            Ctrl+Enter
          </PromptShortcutHint>
        </PromptActions>
      </PromptInput>
    </PromptSection>
  );
};
