/**
 * Hybrid Chunker for RAG Pipeline
 *
 * Two modes:
 * - AST mode (ts-morph): Extracts functions, React components, class methods,
 *   exports as semantically meaningful chunks from .ts/.tsx files.
 * - Sliding window mode: Fixed-size token windows with overlap for .md/.json/.py
 */

import { createHash } from 'node:crypto';
import { Project, SyntaxKind, type SourceFile, type Node } from 'ts-morph';
import type { Chunk, ChunkType, RAGConfig } from './types.js';

// Rough token estimation: ~4 chars per token (GPT-family average)
const CHARS_PER_TOKEN = 4;

export class RAGChunker {
  private maxTokens: number;
  private overlapTokens: number;
  private tsProject: Project;

  constructor(config: Pick<RAGConfig, 'maxChunkTokens' | 'chunkOverlapTokens'>) {
    this.maxTokens = config.maxChunkTokens;
    this.overlapTokens = config.chunkOverlapTokens;
    this.tsProject = new Project({
      compilerOptions: { allowJs: true, jsx: 1 /* Preserve */ },
      useInMemoryFileSystem: true,
    });
  }

  /**
   * Chunk a file based on its language
   */
  chunkFile(filePath: string, content: string): Chunk[] {
    const language = detectLanguage(filePath);

    if (language === 'typescript' || language === 'javascript') {
      return this.chunkAST(filePath, content, language);
    }

    return this.chunkSlidingWindow(filePath, content, language);
  }

  /**
   * AST-aware chunking for TypeScript/JavaScript
   * Extracts top-level declarations as individual chunks
   */
  private chunkAST(
    filePath: string,
    content: string,
    language: 'typescript' | 'javascript',
  ): Chunk[] {
    const chunks: Chunk[] = [];
    const lines = content.split('\n');

    try {
      // Create a virtual source file for parsing
      const sourceFile = this.tsProject.createSourceFile(
        `virtual-${Date.now()}.tsx`,
        content,
        { overwrite: true },
      );

      // Extract import block as context (shared across chunks)
      const imports = this.extractImports(sourceFile);

      // Extract top-level declarations
      for (const statement of sourceFile.getStatements()) {
        const chunk = this.nodeToChunk(statement, filePath, language, imports, lines);
        if (chunk) {
          chunks.push(chunk);
        }
      }

      // Clean up virtual file
      sourceFile.delete();
    } catch (error) {
      // AST parse failed — fall back to sliding window
      console.error(`[RAGChunker] AST parse failed for ${filePath}, using sliding window:`, (error as Error).message);
      return this.chunkSlidingWindow(filePath, content, language);
    }

    // If AST produced no chunks (e.g., file is just imports), use sliding window
    if (chunks.length === 0) {
      return this.chunkSlidingWindow(filePath, content, language);
    }

    // Split oversized chunks via sliding window
    const finalChunks: Chunk[] = [];
    for (const chunk of chunks) {
      if (chunk.tokenCount > this.maxTokens * 1.5) {
        // Chunk is too large, split it
        const subChunks = this.chunkSlidingWindow(filePath, chunk.content, language);
        for (const sub of subChunks) {
          sub.symbolName = chunk.symbolName;
          sub.type = chunk.type;
          sub.parentId = chunk.id;
          sub.startLine = chunk.startLine + sub.startLine - 1;
          sub.endLine = chunk.startLine + sub.endLine - 1;
          finalChunks.push(sub);
        }
      } else {
        finalChunks.push(chunk);
      }
    }

    return finalChunks;
  }

  /**
   * Convert an AST node to a Chunk
   */
  private nodeToChunk(
    node: Node,
    filePath: string,
    language: 'typescript' | 'javascript',
    imports: string[],
    _lines: string[],
  ): Chunk | null {
    const kind = node.getKind();

    // Skip import/export declarations (they're metadata, not content)
    if (
      kind === SyntaxKind.ImportDeclaration ||
      kind === SyntaxKind.ImportEqualsDeclaration
    ) {
      return null;
    }

    const text = node.getFullText().trim();
    if (!text || text.length < 20) return null; // Skip trivial nodes

    const startLine = node.getStartLineNumber();
    const endLine = node.getEndLineNumber();
    const chunkType = syntaxKindToChunkType(kind);
    const symbolName = extractSymbolName(node);

    const content = text;
    const tokenCount = estimateTokens(content);

    return {
      id: makeChunkId(filePath, content),
      filePath,
      content,
      type: chunkType,
      startLine,
      endLine,
      symbolName: symbolName ?? undefined,
      imports: imports.length > 0 ? imports : undefined,
      language,
      tokenCount,
      createdAt: Date.now(),
    };
  }

  /**
   * Extract import statements from source file
   */
  private extractImports(sourceFile: SourceFile): string[] {
    return sourceFile
      .getImportDeclarations()
      .map((imp) => imp.getText().trim());
  }

  /**
   * Sliding window chunking for non-TypeScript files
   */
  private chunkSlidingWindow(
    filePath: string,
    content: string,
    language: Chunk['language'],
  ): Chunk[] {
    const chunks: Chunk[] = [];
    const _lines = content.split('\n');

    const maxChars = this.maxTokens * CHARS_PER_TOKEN;
    const overlapChars = this.overlapTokens * CHARS_PER_TOKEN;

    let position = 0;
    let lineOffset = 0;

    while (position < content.length) {
      // Find end of window
      let end = Math.min(position + maxChars, content.length);

      // Try to break at a line boundary
      if (end < content.length) {
        const nextNewline = content.indexOf('\n', end);
        if (nextNewline !== -1 && nextNewline - end < maxChars * 0.1) {
          end = nextNewline + 1;
        }
      }

      const chunkContent = content.slice(position, end);
      const chunkLines = chunkContent.split('\n');
      const startLine = lineOffset + 1;
      const endLine = startLine + chunkLines.length - 1;

      chunks.push({
        id: makeChunkId(filePath, chunkContent),
        filePath,
        content: chunkContent,
        type: 'text',
        startLine,
        endLine,
        language,
        tokenCount: estimateTokens(chunkContent),
        createdAt: Date.now(),
      });

      // Advance position with overlap
      const advance = Math.max(end - position - overlapChars, maxChars * 0.5);
      lineOffset += content.slice(position, position + advance).split('\n').length - 1;
      position += advance;

      // Prevent infinite loop on tiny content
      if (advance <= 0) break;
    }

    return chunks;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function detectLanguage(filePath: string): Chunk['language'] {
  const ext = filePath.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
    case 'mjs':
    case 'cjs':
      return 'javascript';
    case 'py':
      return 'python';
    case 'md':
    case 'mdx':
      return 'markdown';
    case 'json':
    case 'jsonc':
      return 'json';
    default:
      return 'other';
  }
}

function syntaxKindToChunkType(kind: SyntaxKind): ChunkType {
  switch (kind) {
    case SyntaxKind.FunctionDeclaration:
      return 'function';
    case SyntaxKind.ClassDeclaration:
      return 'class';
    case SyntaxKind.MethodDeclaration:
      return 'method';
    case SyntaxKind.VariableStatement:
    case SyntaxKind.ExportDeclaration:
    case SyntaxKind.ExportAssignment:
      return 'export';
    case SyntaxKind.ModuleDeclaration:
      return 'module';
    default:
      return 'text';
  }
}

function extractSymbolName(node: Node): string | null {
  const kind = node.getKind();

  if (
    kind === SyntaxKind.FunctionDeclaration ||
    kind === SyntaxKind.ClassDeclaration ||
    kind === SyntaxKind.InterfaceDeclaration ||
    kind === SyntaxKind.TypeAliasDeclaration ||
    kind === SyntaxKind.EnumDeclaration
  ) {
    // These node types have a getName() method via their specific interfaces
    const name = (node as { getName?: () => string }).getName?.();
    if (name) return name;
  }

  if (kind === SyntaxKind.VariableStatement) {
    // Extract variable name(s) from the declaration
    const declarations = (node as { getDeclarationList?: () => { getDeclarations?: () => Array<{ getName?: () => string }> } }).getDeclarationList?.()?.getDeclarations?.();
    if (declarations && declarations.length > 0) {
      return declarations.map((d: { getName?: () => string }) => d.getName?.()).filter(Boolean).join(', ');
    }
  }

  return null;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

function makeChunkId(filePath: string, content: string): string {
  return createHash('sha256').update(`${filePath}:${content}`).digest('hex').slice(0, 16);
}
