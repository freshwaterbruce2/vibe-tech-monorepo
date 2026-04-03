export interface FileNode {
  path: string;
  name: string;
  content: string;
  lastModified: number;
  tags: string[]; // e.g., ['component', 'hook', 'auth']
}

export interface SearchResult {
  file: FileNode;
  relevance: number;
  snippet: string;
}

// Simple interface for your file system bridge
// Adapt this to match your specific window.fs or electron API
export interface IFileSystem {
  readFile(path: string): Promise<string>;
  readDir(path: string): Promise<string[]>;
  stat(path: string): Promise<{ mtime: Date, isDirectory: () => boolean }>;
}

export class CodebaseAnalyzer {
  private static instance: CodebaseAnalyzer;
  private fileIndex: Map<string, FileNode> = new Map();
  private ALLOWED_EXTS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.py', '.md'];

  private constructor() {}

  public static getInstance(): CodebaseAnalyzer {
    if (!CodebaseAnalyzer.instance) {
      CodebaseAnalyzer.instance = new CodebaseAnalyzer();
    }
    return CodebaseAnalyzer.instance;
  }

  /**
   * Retrieves the most relevant code snippets for a given user query
   */
  public async getContextForQuery(query: string, maxFiles: number = 3): Promise<string> {
    const results = this.search(query);
    const topResults = results.slice(0, maxFiles);

    if (topResults.length === 0) return '';

    return topResults.map(res =>
      `\n--- FILE: ${res.file.path} (Relevance: ${res.relevance.toFixed(2)}) ---\n` +
      `${res.snippet}\n`
    ).join('\n');
  }

  /**
   * Simple keyword-based search with scoring
   */
  public search(query: string): SearchResult[] {
    const terms = query.toLowerCase().split(' ').filter(t => t.length > 2);
    const results: SearchResult[] = [];

    this.fileIndex.forEach(file => {
      let score = 0;
      const contentLower = file.content.toLowerCase();

      // Scoring Logic
      terms.forEach(term => {
        if (file.name.toLowerCase().includes(term)) score += 10; // Filename match is high value
        if (contentLower.includes(term)) score += 1; // Content match
      });

      if (score > 0) {
        results.push({
          file,
          relevance: score,
          snippet: this.extractSnippet(file.content, terms[0] ?? '')
        });
      }
    });

    return results.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Adds a file to the in-memory index
   */
  public indexFile(path: string, content: string, lastModified: number) {
    // Basic extension check
    if (!this.ALLOWED_EXTS.some(ext => path.endsWith(ext))) return;

    this.fileIndex.set(path, {
      path,
      name: path.split('/').pop() ?? path,
      content,
      lastModified,
      tags: this.generateTags(path, content)
    });
  }

  private generateTags(path: string, content: string): string[] {
    const tags: string[] = [];
    if (path.includes('components')) tags.push('component');
    if (path.includes('hooks')) tags.push('hook');
    if (path.includes('services')) tags.push('service');
    if (content.includes('interface') || content.includes('type ')) tags.push('type-def');
    return tags;
  }

  private extractSnippet(content: string, keyword: string): string {
    if (!keyword) return content.slice(0, 500) + '...';

    const index = content.toLowerCase().indexOf(keyword);
    const start = Math.max(0, index - 100);
    const end = Math.min(content.length, index + 400);

    return (start > 0 ? '...' : '') + content.slice(start, end) + (end < content.length ? '...' : '');
  }
}

export const codebaseAnalyzer = CodebaseAnalyzer.getInstance();
