/**
 * CodeExecutorTypes - Shared types and interfaces for CodeExecutor
 */

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  exitCode?: number;
  executionTime: number;
  resourceUsage?: {
    memory?: number;
    cpu?: number;
  };
}

export interface ExecutionOptions {
  timeout?: number;
  workingDirectory?: string;
  environment?: Record<string, string>;
  shell?: boolean;
  stdin?: string;
  maxMemory?: number;
  args?: string[];
  sandbox?: boolean;
}

export interface SecurityPolicy {
  allowNetworkAccess: boolean;
  allowFileSystemAccess: boolean;
  allowedDirectories: string[];
  blockedCommands: string[];
  maxExecutionTime: number;
  maxMemoryUsage: number;
}

export type SupportedLanguage =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'bash'
  | 'node'
  | 'deno'
  | 'bun';
