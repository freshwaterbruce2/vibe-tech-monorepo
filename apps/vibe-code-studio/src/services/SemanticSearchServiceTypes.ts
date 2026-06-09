/**
 * SemanticSearchServiceTypes
 * Shared types, interfaces, and constants for SemanticSearchService
 */

export interface SearchQuery {
  query: string;
  filters?: SearchFilters;
  maxResults?: number;
}

export interface SearchFilters {
  fileTypes?: string[]; // ['ts', 'tsx', 'js', 'jsx']
  directories?: string[]; // ['src/components', 'src/services']
  excludePatterns?: string[]; // ['node_modules', 'dist', 'test']
  dateRange?: {
    from?: Date;
    to?: Date;
  };
}

export interface SearchResult {
  id: string;
  filePath: string;
  fileName: string;
  fileType: string;
  snippet: string; // Code snippet with context
  lineNumber: number;
  relevanceScore: number; // 0-100 (AI confidence)
  matchType: 'semantic' | 'exact' | 'fuzzy';
  context?: {
    functionName?: string;
    className?: string;
    imports?: string[];
    exports?: string[];
  };
  explanation?: string; // Why this result matches
}

export interface SearchMetadata {
  totalFiles: number;
  filesSearched: number;
  searchTime: number; // milliseconds
  modelUsed: string;
  tokenCost?: number;
}

/** Internal file content representation (not exported from public API) */
export interface FileContent {
  path: string;
  content: string;
  language: string;
}

/** File extensions that map to searchable language identifiers */
export const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.py': 'python',
  '.rs': 'rust',
  '.go': 'go',
  '.json': 'json',
  '.css': 'css',
  '.scss': 'scss',
  '.html': 'html',
  '.md': 'markdown',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.toml': 'toml',
  '.sql': 'sql',
  '.sh': 'shell',
  '.ps1': 'powershell',
};

/** Directories that should always be excluded from indexing */
export const DEFAULT_EXCLUDE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', '.nx', '.cache',
  'coverage', '.next', '.turbo', '__pycache__', '.venv',
  'vendor', 'target', '.output',
]);
