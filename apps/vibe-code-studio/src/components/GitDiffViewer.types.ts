import type { ConflictResolution as ConflictResolutionType } from '../services/GitDiffService';
import type { UnifiedAIService } from '../services/ai/UnifiedAIService';

export interface GitDiffViewerProps {
  aiService: UnifiedAIService;
  diffText: string;
  onClose: () => void;
}

export interface FileConflictState {
  showManualEdit: boolean;
  manualContent: string;
  aiSuggestion: {
    resolution: ConflictResolutionType['resolution'];
    explanation: string;
    preview: string;
  } | null;
  isLoadingAI: boolean;
  resolved: boolean;
  resolvedWith: string;
}
