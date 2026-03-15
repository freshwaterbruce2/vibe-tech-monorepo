import type { UnifiedAIService } from '../../../services/ai/UnifiedAIService';

export interface ComposerFile {
  id: string;
  path: string;
  content: string;
  originalContent: string;
  language: string;
  isDirty: boolean;
  isNew: boolean;
}

export interface ComposerModeProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyChanges: (files: ComposerFile[]) => void;
  initialFiles?: ComposerFile[];
  workspaceContext?: {
    recentFiles: string[];
    openFiles: string[];
    gitBranch?: string;
  };
  currentModel?: string;
  aiService?: UnifiedAIService;
}
