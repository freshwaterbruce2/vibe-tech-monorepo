/**
 * WorkspaceServiceHelpers - Pure helper functions for WorkspaceService
 * Language detection, file classification, mock data, search scoring, and path resolution
 */

import type { FileAnalysis, FileSystemItem } from '../types';

// --- Language detection ---

const LANGUAGE_MAP: Record<string, string> = {
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

export function getLanguageFromExtension(ext: string): string {
  return LANGUAGE_MAP[ext] ?? 'plaintext';
}

// --- File classification ---

const TEST_PATTERNS = [
  /\.test\.(ts|tsx|js|jsx)$/,
  /\.spec\.(ts|tsx|js|jsx)$/,
  /\/__tests__\//,
  /\/tests?\//,
];

const CONFIG_PATTERNS = [
  /package\.json$/,
  /tsconfig.*\.json$/,
  /vite\.config\./,
  /webpack\.config\./,
  /\.eslintrc/,
  /\.prettierrc/,
  /\.gitignore$/,
];

export function isTestFile(filePath: string): boolean {
  return TEST_PATTERNS.some((pattern) => pattern.test(filePath));
}

export function isConfigFile(filePath: string): boolean {
  return CONFIG_PATTERNS.some((pattern) => pattern.test(filePath));
}

// --- Mock data helpers ---

export function getMockImports(filePath: string): string[] {
  const fileName =
    filePath
      .split('/')
      .pop()
      ?.replace(/\.(tsx?|jsx?)$/, '') ?? '';

  const commonImports = ['react', 'styled-components'];
  const mockImports: string[] = [...commonImports];

  if (fileName.includes('Service')) {
    mockImports.push('axios', '../types');
  }
  if (fileName.includes('Component') || fileName.includes('tsx')) {
    mockImports.push('lucide-react', 'framer-motion');
  }

  return mockImports;
}

export function getMockExports(filePath: string): string[] {
  const fileName =
    filePath
      .split('/')
      .pop()
      ?.replace(/\.(tsx?|jsx?)$/, '') ?? '';
  return [fileName, `${fileName}Props`, `use${fileName}`];
}

export function getMockSymbols(filePath: string): string[] {
  const fileName =
    filePath
      .split('/')
      .pop()
      ?.replace(/\.(tsx?|jsx?)$/, '') ?? '';
  const symbols: string[] = [];

  if (fileName.includes('Service')) {
    symbols.push(`${fileName}`, `get${fileName}Instance`, `${fileName.toLowerCase()}Methods`);
  }
  if (fileName.includes('Component') || fileName.includes('tsx')) {
    symbols.push(`${fileName}`, `${fileName}Props`, `Styled${fileName}`);
  }

  return symbols;
}

export function getMockFileTree(rootPath: string): FileSystemItem[] {
  return [
    {
      name: 'src',
      path: `${rootPath}/src`,
      type: 'directory',
      children: [
        { name: 'App.tsx', path: `${rootPath}/src/App.tsx`, type: 'file' },
        { name: 'index.ts', path: `${rootPath}/src/index.ts`, type: 'file' },
        {
          name: 'components',
          path: `${rootPath}/src/components`,
          type: 'directory',
          children: [
            { name: 'Button.tsx', path: `${rootPath}/src/components/Button.tsx`, type: 'file' },
            { name: 'Modal.tsx', path: `${rootPath}/src/components/Modal.tsx`, type: 'file' },
            { name: 'Editor.tsx', path: `${rootPath}/src/components/Editor.tsx`, type: 'file' },
            { name: 'Sidebar.tsx', path: `${rootPath}/src/components/Sidebar.tsx`, type: 'file' },
          ],
        },
        {
          name: 'services',
          path: `${rootPath}/src/services`,
          type: 'directory',
          children: [
            {
              name: 'DeepSeekService.ts',
              path: `${rootPath}/src/services/DeepSeekService.ts`,
              type: 'file',
            },
            {
              name: 'FileSystemService.ts',
              path: `${rootPath}/src/services/FileSystemService.ts`,
              type: 'file',
            },
            {
              name: 'WorkspaceService.ts',
              path: `${rootPath}/src/services/WorkspaceService.ts`,
              type: 'file',
            },
          ],
        },
        {
          name: 'types',
          path: `${rootPath}/src/types`,
          type: 'directory',
          children: [{ name: 'index.ts', path: `${rootPath}/src/types/index.ts`, type: 'file' }],
        },
        {
          name: 'hooks',
          path: `${rootPath}/src/hooks`,
          type: 'directory',
          children: [
            {
              name: 'useFileSystem.ts',
              path: `${rootPath}/src/hooks/useFileSystem.ts`,
              type: 'file',
            },
            {
              name: 'useWorkspace.ts',
              path: `${rootPath}/src/hooks/useWorkspace.ts`,
              type: 'file',
            },
          ],
        },
      ],
    },
    {
      name: 'public',
      path: `${rootPath}/public`,
      type: 'directory',
      children: [
        { name: 'index.html', path: `${rootPath}/public/index.html`, type: 'file' },
        { name: 'icon.png', path: `${rootPath}/public/icon.png`, type: 'file' },
      ],
    },
    { name: 'package.json', path: `${rootPath}/package.json`, type: 'file' },
    { name: 'tsconfig.json', path: `${rootPath}/tsconfig.json`, type: 'file' },
    { name: 'vite.config.ts', path: `${rootPath}/vite.config.ts`, type: 'file' },
    { name: 'README.md', path: `${rootPath}/README.md`, type: 'file' },
  ];
}

// --- Path resolution ---

/**
 * Resolve a relative import path to an absolute path.
 * Pass the current index files map so the lookup can check for known extensions.
 */
export function resolveRelativePath(
  currentPath: string,
  relativePath: string,
  indexFiles: Map<string, unknown>
): string {
  const currentDir = currentPath.split('/').slice(0, -1).join('/');
  const resolved = `${currentDir}/${relativePath}`;

  const extensions = ['.ts', '.tsx', '.js', '.jsx'];
  for (const ext of extensions) {
    const withExt = `${resolved}${ext}`;
    if (indexFiles.has(withExt)) {
      return withExt;
    }
  }

  return resolved;
}

// --- Search scoring ---

export function calculateSearchScore(analysis: FileAnalysis, query: string): number {
  let score = 0;

  if (analysis.name.toLowerCase().includes(query)) {
    score += 10;
  }

  for (const symbol of analysis.symbols) {
    if (symbol.toLowerCase().includes(query)) {
      score += 5;
    }
  }

  for (const exp of analysis.exports) {
    if (exp.toLowerCase().includes(query)) {
      score += 3;
    }
  }

  if (analysis.language.toLowerCase().includes(query)) {
    score += 2;
  }

  return score;
}
