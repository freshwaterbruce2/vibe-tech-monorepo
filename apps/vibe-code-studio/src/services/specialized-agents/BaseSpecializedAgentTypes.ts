/**
 * Shared type definitions for the specialized agent system.
 * Extracted from BaseSpecializedAgent to keep file sizes manageable.
 */

export enum AgentCapability {
  CODE_ANALYSIS = 'code_analysis',
  CODE_GENERATION = 'code_generation',
  CODE_REVIEW = 'code_review',
  REFACTORING = 'refactoring',
  DEBUGGING = 'debugging',
  TESTING = 'testing',
  DOCUMENTATION = 'documentation',
  SECURITY_SCANNING = 'security_scanning',
  PERFORMANCE_PROFILING = 'performance_profiling',
  ARCHITECTURE_DESIGN = 'architecture_design',
  SYSTEM_DESIGN = 'system_design',
  API_DESIGN = 'api_design',
  DATABASE_DESIGN = 'database_design',
  UI_DESIGN = 'ui_design',
  ACCESSIBILITY = 'accessibility',
  DEPLOYMENT = 'deployment',
  MONITORING = 'monitoring',
  OPTIMIZATION = 'optimization',
  BEST_PRACTICES = 'best_practices',
  DESIGN_PATTERNS = 'design_patterns',
  FORMATTING = 'formatting',
  ERROR_HANDLING = 'error_handling',
  STATE_MANAGEMENT = 'state_management',
  AUTHENTICATION = 'authentication',
  CACHING = 'caching',
  REAL_TIME = 'real_time',
  MICROSERVICES = 'microservices',
  CONTAINERIZATION = 'containerization',
  CI_CD = 'ci_cd',
  LOAD_TESTING = 'load_testing',
  VULNERABILITY_SCANNING = 'vulnerability_scanning',
  PENETRATION_TESTING = 'penetration_testing',
  COMPLIANCE = 'compliance',
  DATA_VALIDATION = 'data_validation',
  INTERNATIONALIZATION = 'internationalization',
  SEO = 'seo',
  ANALYTICS = 'analytics'
}

export interface AgentContext {
  workspaceRoot?: string;
  currentFile?: string;
  selectedText?: string;
  files?: string[];
  recentFiles?: string[];
  gitBranch?: string;
  projectType?: string;
  dependencies?: string[];
  userPreferences?: Record<string, unknown>;
  sessionHistory?: AgentMemory[];
  relatedFiles?: string[];
  codebaseMetrics?: CodebaseMetrics;
}

export interface CodebaseMetrics {
  totalFiles: number;
  totalLines: number;
  languages: Record<string, number>;
  complexity: number;
  testCoverage?: number;
  techStack: string[];
  patterns: string[];
}

export interface AgentResponse {
  content: string;
  confidence: number;
  reasoning?: string;
  suggestions?: string[];
  codeChanges?: CodeChange[];
  followupQuestions?: string[];
  relatedTopics?: string[];
  performance?: PerformanceMetrics;
}

export interface CodeChange {
  filePath: string;
  type: 'create' | 'modify' | 'delete';
  content?: string;
  lineStart?: number;
  lineEnd?: number;
  description: string;
}

export interface PerformanceMetrics {
  processingTime: number;
  memoryUsage: number;
  apiCalls: number;
  cacheHits: number;
  tokenCount: number;
}

export interface AgentMemory {
  id: string;
  timestamp: Date;
  request: string;
  response: string;
  context: Partial<AgentContext>;
  success: boolean;
  learnings?: string[];
  patterns?: string[];
}

export interface LearningPattern {
  pattern: string;
  frequency: number;
  successRate: number;
  contexts: string[];
  lastUsed: Date;
}
