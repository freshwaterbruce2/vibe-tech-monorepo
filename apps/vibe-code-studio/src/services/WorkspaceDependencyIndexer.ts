import type { FileAnalysis } from '../types';
import type { WorkspaceIndex } from './WorkspaceService';

export class WorkspaceDependencyIndexer {
  buildDependencyGraph(index: WorkspaceIndex): void {
    for (const [filePath, analysis] of index.files) {
      const dependencies: string[] = [];

      for (const importPath of analysis.imports) {
        if (importPath.startsWith('.')) {
          const resolvedPath = this.resolveRelativePath(filePath, importPath, index.files);
          if (index.files.has(resolvedPath)) {
            dependencies.push(resolvedPath);
          }
        }
      }

      index.dependencies.set(filePath, dependencies);
    }
  }

  extractSymbolsAndExports(index: WorkspaceIndex): void {
    for (const [filePath, analysis] of index.files) {
      index.exports.set(filePath, analysis.exports);
      index.symbols.set(filePath, analysis.symbols);
    }
  }

  private resolveRelativePath(currentPath: string, relativePath: string, files: Map<string, FileAnalysis>): string {
    const currentDir = currentPath.split('/').slice(0, -1).join('/');
    const resolved = `${currentDir}/${relativePath}`;

    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    for (const ext of extensions) {
      const withExt = `${resolved}${ext}`;
      if (files.has(withExt)) {
        return withExt;
      }
    }

    return resolved;
  }
}
