/**
 * WorkspaceServiceTypes - Shared types and interfaces for WorkspaceService
 */

import type { FileAnalysis } from '../types';

export interface WorkspaceIndex {
  files: Map<string, FileAnalysis>;
  dependencies: Map<string, string[]>;
  exports: Map<string, string[]>;
  imports: Map<string, string[]>;
  symbols: Map<string, string[]>;
  lastUpdated: Date;
}

export interface PackageJson {
  name?: string;
  version?: string;
  main?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  [key: string]: unknown;
}

export interface TsConfig {
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
