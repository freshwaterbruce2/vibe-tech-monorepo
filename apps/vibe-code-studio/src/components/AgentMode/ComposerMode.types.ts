export interface ComposerFile {
  id: string;
  path: string;
  content: string;
  originalContent: string;
  language: string;
  isDirty: boolean;
  isNew: boolean;
}

export interface ComposerWorkspaceContext {
  recentFiles: string[];
  openFiles: string[];
  gitBranch?: string;
}
