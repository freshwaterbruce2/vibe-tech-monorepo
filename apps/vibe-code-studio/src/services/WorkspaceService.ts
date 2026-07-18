import { logger } from '../services/Logger';
import type { FileAnalysis, FileSystemItem, WorkspaceContext } from '../types';

import { FileSystemService } from './FileSystemService';
import { walkDirectoryTree } from './fileTreeWalker';

/** Minimal file-access surface WorkspaceService needs (real FS or a test double). */
export interface WorkspaceFileSystem {
  listDirectory(path: string): Promise<FileSystemItem[]>;
  readFile(path: string): Promise<string>;
  exists(path: string): Promise<boolean>;
}

export interface WorkspaceIndex {
  files: Map<string, FileAnalysis>;
  dependencies: Map<string, string[]>;
  exports: Map<string, string[]>;
  imports: Map<string, string[]>;
  symbols: Map<string, string[]>;
  /** First N chars of each analyzed code file — real content for AI context. */
  contentPreviews: Map<string, string>;
  lastUpdated: Date;
}

interface PackageJson {
  name?: string;
  version?: string;
  main?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

interface TsConfig {
  compilerOptions?: {
    target?: string;
    module?: string;
    strict?: boolean;
    esModuleInterop?: boolean;
    [key: string]: unknown;
  };
  include?: string[];
  exclude?: string[];
  [key: string]: unknown;
}

export interface ProjectStructure {
  rootPath: string;
  packageJson?: PackageJson;
  tsConfig?: TsConfig;
  gitignore?: string[];
  readmeContent?: string;
  mainEntryPoints: string[];
  testFiles: string[];
  configFiles: string[];
}

export class WorkspaceService {
  private index: WorkspaceIndex;
  private projectStructure: ProjectStructure | null = null;
  private indexingInProgress = false;
  private readonly fs: WorkspaceFileSystem;

  // Extensions whose text content is worth reading + parsing for context.
  private static readonly CODE_EXTENSIONS = new Set([
    'ts',
    'tsx',
    'js',
    'jsx',
    'mjs',
    'cjs',
    'json',
    'md',
    'mdx',
    'css',
    'scss',
    'less',
    'html',
    'py',
    'rs',
    'go',
    'java',
    'rb',
    'php',
    'c',
    'cpp',
    'cs',
    'sh',
    'sql',
    'yaml',
    'yml',
    'toml',
  ]);
  private static readonly MAX_FILES = 4000;
  private static readonly PREVIEW_CHARS = 4000;

  constructor(fileSystem?: WorkspaceFileSystem) {
    // Default to the real FileSystemService (Tauri disk reads on desktop,
    // in-memory demo files on web). Injectable for tests.
    this.fs = fileSystem ?? new FileSystemService();
    this.index = this.emptyIndex();
  }

  private emptyIndex(): WorkspaceIndex {
    return {
      files: new Map(),
      dependencies: new Map(),
      exports: new Map(),
      imports: new Map(),
      symbols: new Map(),
      contentPreviews: new Map(),
      lastUpdated: new Date(),
    };
  }

  async indexWorkspace(
    rootPath: string,
    onProgress?: (progress: number) => void
  ): Promise<WorkspaceContext> {
    // If indexing is already in progress, return existing context gracefully
    // This handles React StrictMode double-invoke and rapid re-renders
    if (this.indexingInProgress) {
      logger.debug('Indexing already in progress, returning existing context');
      return this.getWorkspaceContext();
    }

    this.indexingInProgress = true;
    logger.debug(`Starting workspace indexing for: ${rootPath}`);

    try {
      // Reset so a re-index reflects the current tree (not a merge of old runs).
      this.index = this.emptyIndex();
      onProgress?.(0);

      // Real phase-based progress: each callback fires only after the stage it
      // reports genuinely completes (no simulated/random ticking).
      // 1. Analyze project structure
      this.projectStructure = await this.analyzeProjectStructure(rootPath);
      onProgress?.(15);

      // 2. Build file tree and index files
      const fileTree = await this.buildFileTree(rootPath);
      onProgress?.(30);

      // 3. Analyze each file for context (heaviest stage)
      await this.analyzeFiles(fileTree);
      onProgress?.(75);

      // 4. Build dependency graph
      await this.buildDependencyGraph();
      onProgress?.(90);

      // 5. Extract symbols and exports
      await this.extractSymbolsAndExports();

      this.index.lastUpdated = new Date();
      onProgress?.(100);

      logger.debug(`Workspace indexing completed. Indexed ${this.index.files.size} files`);

      return this.getWorkspaceContext();
    } finally {
      this.indexingInProgress = false;
    }
  }

  private async analyzeProjectStructure(rootPath: string): Promise<ProjectStructure> {
    const structure: ProjectStructure = {
      rootPath,
      mainEntryPoints: [],
      testFiles: [],
      configFiles: [],
    };

    try {
      // Check for package.json
      const packageJsonPath = `${rootPath}/package.json`;
      if (await this.fileExists(packageJsonPath)) {
        const content = await this.readFile(packageJsonPath);
        structure.packageJson = JSON.parse(content);
        structure.configFiles.push('package.json');

        // Identify main entry points
        if (structure.packageJson?.main) {
          structure.mainEntryPoints.push(structure.packageJson.main);
        }
        if (structure.packageJson?.['module']) {
          structure.mainEntryPoints.push(structure.packageJson['module'] as string);
        }
      }

      // Check for tsconfig.json

      const tsconfigPath = `${rootPath}/tsconfig.json`;

      if (await this.fileExists(tsconfigPath)) {
        try {
          const content = await this.readFile(tsconfigPath);

          // Remove comments from JSONC (JSON with Comments) format
          // Line comments: strip entire line after //
          // Block comments: remove /* */ blocks
          const jsonContent = content
            .split('\n')
            .map(line => {
              // Remove line comments
              const commentIndex = line.indexOf('//');
              if (commentIndex !== -1) {
                return line.substring(0, commentIndex);
              }
              return line;
            })
            .join('\n')
            .replace(/\/\*[\s\S]*?\*\//g, ''); // Remove block comments

          structure.tsConfig = JSON.parse(jsonContent);
          structure.configFiles.push('tsconfig.json');
        } catch {
          // Silently track file exists even if parsing fails
          // This is non-critical - tsconfig parsing is just for additional context
          structure.configFiles.push('tsconfig.json');
        }
      }

      // Check for README
      const readmePaths = ['README.md', 'readme.md', 'README.txt'];
      for (const readmePath of readmePaths) {
        const fullPath = `${rootPath}/${readmePath}`;
        if (await this.fileExists(fullPath)) {
          structure.readmeContent = await this.readFile(fullPath);
          break;
        }
      }

      // Check for .gitignore
      const gitignorePath = `${rootPath}/.gitignore`;
      if (await this.fileExists(gitignorePath)) {
        const content = await this.readFile(gitignorePath);
        structure.gitignore = content
          .split('\n')
          .filter(line => line.trim() && !line.startsWith('#'));
      }
    } catch (error) {
      logger.warn('Error analyzing project structure:', error);
    }

    return structure;
  }

  /** Build a real recursive file tree from the workspace, skipping build/dep dirs. */
  private async buildFileTree(rootPath: string): Promise<FileSystemItem[]> {
    return walkDirectoryTree(this.fs, rootPath);
  }

  private async analyzeFiles(fileTree: FileSystemItem[]): Promise<void> {
    const files: FileSystemItem[] = [];
    const collect = (item: FileSystemItem): void => {
      if (item.type === 'file') {
        files.push(item);
      } else if (item.children) {
        item.children.forEach(collect);
      }
    };
    fileTree.forEach(collect);

    // Cap total analyzed files so a huge workspace can't stall the UI thread.
    const capped = files.slice(0, WorkspaceService.MAX_FILES);
    for (const item of capped) {
      const analysis = await this.analyzeFile(item.path, item.size);
      this.index.files.set(item.path, analysis);
    }
    if (files.length > capped.length) {
      logger.warn(
        `[WorkspaceService] Indexed ${capped.length}/${files.length} files (MAX_FILES cap)`
      );
    }
  }

  private async analyzeFile(filePath: string, knownSize?: number): Promise<FileAnalysis> {
    const extension = filePath.split('.').pop()?.toLowerCase() ?? '';
    const fileName = filePath.split('/').pop() ?? '';
    const language = this.getLanguageFromExtension(extension);

    const analysis: FileAnalysis = {
      path: filePath,
      name: fileName,
      extension,
      language,
      size: knownSize ?? 0,
      lastModified: new Date(),
      imports: [],
      exports: [],
      symbols: [],
      dependencies: [],
      isTestFile: this.isTestFile(filePath),
      isConfigFile: this.isConfigFile(filePath),
      complexity: 1,
      summary: `${fileName} - ${language} file`,
    };

    // Only read+parse text/code files; skip binaries and unknown types.
    if (!WorkspaceService.CODE_EXTENSIONS.has(extension)) {
      return analysis;
    }

    let content: string;
    try {
      content = await this.fs.readFile(filePath);
    } catch (error) {
      logger.warn(`[WorkspaceService] Failed to read ${filePath}:`, error);
      return analysis;
    }

    analysis.size = knownSize && knownSize > 0 ? knownSize : content.length;
    analysis.complexity = this.computeComplexity(content);
    this.index.contentPreviews.set(filePath, content.slice(0, WorkspaceService.PREVIEW_CHARS));

    if (['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'].includes(extension)) {
      analysis.imports = this.extractImports(content);
      analysis.exports = this.extractExports(content);
      analysis.symbols = this.extractSymbols(content);
    }

    return analysis;
  }

  /** Extract module specifiers from import/export-from/require statements. */
  private extractImports(content: string): string[] {
    const specifiers = new Set<string>();
    const fromRe = /(?:import|export)[\s\S]*?from\s*['"]([^'"]+)['"]/g;
    const bareRe = /import\s*['"]([^'"]+)['"]/g;
    const requireRe = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
    for (const re of [fromRe, bareRe, requireRe]) {
      let match: RegExpExecArray | null;
      while ((match = re.exec(content)) !== null) {
        if (match[1]) specifiers.add(match[1]);
      }
    }
    return [...specifiers];
  }

  /** Extract exported names (declarations, re-exports, and default). */
  private extractExports(content: string): string[] {
    const names = new Set<string>();
    const declRe =
      /export\s+(?:default\s+)?(?:async\s+)?(?:const|let|var|function|class|interface|type|enum)\s+([A-Za-z0-9_$]+)/g;
    const namedRe = /export\s*\{([^}]+)\}/g;
    let match: RegExpExecArray | null;
    while ((match = declRe.exec(content)) !== null) {
      if (match[1]) names.add(match[1]);
    }
    while ((match = namedRe.exec(content)) !== null) {
      const group = match[1] ?? '';
      for (const part of group.split(',')) {
        const name = part
          .trim()
          .split(/\s+as\s+/)
          .pop()
          ?.trim();
        if (name) names.add(name);
      }
    }
    if (/export\s+default/.test(content)) {
      names.add('default');
    }
    return [...names];
  }

  /** Extract top-level declared symbol names for search/context. */
  private extractSymbols(content: string): string[] {
    const names = new Set<string>();
    const re = /(?:function|class|interface|type|enum|const|let|var)\s+([A-Za-z0-9_$]+)/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(content)) !== null) {
      if (match[1]) names.add(match[1]);
    }
    return [...names];
  }

  /** Cyclomatic-ish complexity: count of branch/loop keywords (real, not random). */
  private computeComplexity(content: string): number {
    const matches = content.match(/\b(if|else|for|while|switch|case|catch|try)\b/g);
    return (matches ? matches.length : 0) + 1;
  }

  private async buildDependencyGraph(): Promise<void> {
    // Build relationships between files based on imports/exports
    for (const [filePath, analysis] of this.index.files) {
      const dependencies: string[] = [];

      for (const importPath of analysis.imports) {
        // Resolve relative imports to absolute paths
        if (importPath.startsWith('.')) {
          const resolvedPath = this.resolveRelativePath(filePath, importPath);
          if (this.index.files.has(resolvedPath)) {
            dependencies.push(resolvedPath);
          }
        }
      }

      this.index.dependencies.set(filePath, dependencies);
    }
  }

  private async extractSymbolsAndExports(): Promise<void> {
    // Extract all symbols and exports for quick lookup
    for (const [filePath, analysis] of this.index.files) {
      this.index.exports.set(filePath, analysis.exports);
      this.index.symbols.set(filePath, analysis.symbols);
    }
  }

  private resolveRelativePath(currentPath: string, relativePath: string): string {
    // Normalize '.'/'..' segments against the importing file's directory.
    const stack = currentPath.split('/').slice(0, -1);
    for (const part of relativePath.split('/')) {
      if (part === '' || part === '.') continue;
      if (part === '..') stack.pop();
      else stack.push(part);
    }
    const resolved = stack.join('/');

    // Try the path as-is, with a source extension, or as a directory index.
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx'];
    for (const ext of extensions) {
      if (this.index.files.has(`${resolved}${ext}`)) {
        return `${resolved}${ext}`;
      }
    }
    for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
      if (this.index.files.has(`${resolved}/index${ext}`)) {
        return `${resolved}/index${ext}`;
      }
    }
    return resolved;
  }

  private getLanguageFromExtension(ext: string): string {
    const languageMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      php: 'php',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      html: 'html',
      css: 'css',
      scss: 'scss',
      json: 'json',
      xml: 'xml',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
      sh: 'shell',
      sql: 'sql',
    };
    return languageMap[ext] ?? 'plaintext';
  }

  private isTestFile(filePath: string): boolean {
    const testPatterns = [
      /\.test\.(ts|tsx|js|jsx)$/,
      /\.spec\.(ts|tsx|js|jsx)$/,
      /\/__tests__\//,
      /\/tests?\//,
    ];
    return testPatterns.some(pattern => pattern.test(filePath));
  }

  private isConfigFile(filePath: string): boolean {
    const configPatterns = [
      /package\.json$/,
      /tsconfig.*\.json$/,
      /vite\.config\./,
      /webpack\.config\./,
      /\.eslintrc/,
      /\.prettierrc/,
      /\.gitignore$/,
    ];
    return configPatterns.some(pattern => pattern.test(filePath));
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      return await this.fs.exists(path);
    } catch (error) {
      logger.warn(`[WorkspaceService] exists() failed for ${path}:`, error);
      return false;
    }
  }

  private async readFile(path: string): Promise<string> {
    return this.fs.readFile(path);
  }

  /** Real content preview (first N chars) captured during indexing, for AI context. */
  getFileContentPreview(path: string): string {
    return this.index.contentPreviews.get(path) ?? '';
  }

  getWorkspaceContext(): WorkspaceContext {
    const totalFiles = this.index.files.size;
    const languages = new Set(Array.from(this.index.files.values()).map(f => f.language));
    const testFiles = Array.from(this.index.files.values()).filter(f => f.isTestFile);

    return {
      rootPath: this.projectStructure?.rootPath ?? '',
      totalFiles,
      languages: Array.from(languages),
      testFiles: testFiles.length,
      projectStructure: (this.projectStructure ?? {}) as Record<string, unknown>,
      dependencies: Object.fromEntries(this.index.dependencies),
      exports: Object.fromEntries(this.index.exports),
      symbols: Object.fromEntries(this.index.symbols),
      lastIndexed: this.index.lastUpdated,
      summary: this.generateWorkspaceSummary(),
    };
  }

  private generateWorkspaceSummary(): string {
    const totalFiles = this.index.files.size;
    const languages = new Set(Array.from(this.index.files.values()).map(f => f.language));
    const testFiles = Array.from(this.index.files.values()).filter(f => f.isTestFile).length;

    let summary = `Workspace contains ${totalFiles} files across ${languages.size} languages. `;
    summary += `Primary languages: ${Array.from(languages).slice(0, 3).join(', ')}. `;
    summary += `${testFiles} test files detected. `;

    if (this.projectStructure?.packageJson) {
      summary += `Node.js project with ${Object.keys(this.projectStructure.packageJson.dependencies ?? {}).length} dependencies. `;
    }

    return summary;
  }

  getRelatedFiles(filePath: string, maxResults = 10): string[] {
    const related: string[] = [];
    const fileAnalysis = this.index.files.get(filePath);

    if (!fileAnalysis) {
      return related;
    }

    // 1. Direct dependencies
    const dependencies = this.index.dependencies.get(filePath) ?? [];
    related.push(...dependencies);

    // 2. Files that depend on this file
    for (const [path, deps] of this.index.dependencies) {
      if (deps.includes(filePath) && !related.includes(path)) {
        related.push(path);
      }
    }

    // 3. Files in same directory
    const directory = filePath.split('/').slice(0, -1).join('/');
    for (const [path] of this.index.files) {
      if (path.startsWith(directory) && path !== filePath && !related.includes(path)) {
        related.push(path);
      }
    }

    return related.slice(0, maxResults);
  }

  getFileContent(filePath: string): FileAnalysis | null {
    return this.index.files.get(filePath) ?? null;
  }

  searchFiles(query: string, maxResults = 20): FileAnalysis[] {
    const results: FileAnalysis[] = [];
    const lowerQuery = query.toLowerCase();

    for (const analysis of this.index.files.values()) {
      const score = this.calculateSearchScore(analysis, lowerQuery);
      if (score > 0) {
        results.push({ ...analysis, searchScore: score });
      }
    }

    return results.sort((a, b) => (b.searchScore ?? 0) - (a.searchScore ?? 0)).slice(0, maxResults);
  }

  private calculateSearchScore(analysis: FileAnalysis, query: string): number {
    let score = 0;

    // File name match
    if (analysis.name.toLowerCase().includes(query)) {
      score += 10;
    }

    // Symbol match
    for (const symbol of analysis.symbols) {
      if (symbol.toLowerCase().includes(query)) {
        score += 5;
      }
    }

    // Export match
    for (const exp of analysis.exports) {
      if (exp.toLowerCase().includes(query)) {
        score += 3;
      }
    }

    // Language match
    if (analysis.language.toLowerCase().includes(query)) {
      score += 2;
    }

    return score;
  }

  isIndexed(): boolean {
    return this.index.files.size > 0;
  }

  getIndexStats() {
    return {
      totalFiles: this.index.files.size,
      totalDependencies: this.index.dependencies.size,
      totalSymbols: Array.from(this.index.symbols.values()).flat().length,
      lastUpdated: this.index.lastUpdated,
      isIndexing: this.indexingInProgress,
    };
  }
}
