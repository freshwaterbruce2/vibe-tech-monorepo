export interface CodebaseContext {
  projectStructure: ProjectStructure;
  dependencies: DependencyMap;
  patterns: CodePatterns;
  metrics: CodebaseMetrics;
  relationships: FileRelationships;
  documentation: ProjectDocumentation;
  technicalDebt: TechnicalDebt[];
  architecture: ArchitectureInsights;
}

export interface ProjectStructure {
  rootPath: string;
  directories: DirectoryNode[];
  fileTypes: Record<string, number>;
  totalFiles: number;
  totalLines: number;
  languages: LanguageDistribution[];
}

export interface DirectoryNode {
  name: string;
  path: string;
  type: 'directory' | 'file';
  children?: DirectoryNode[];
  size?: number;
  lines?: number;
  language?: string;
}

export interface DependencyMap {
  internal: InternalDependency[];
  external: ExternalDependency[];
  circular: CircularDependency[];
  unused: string[];
  missing: string[];
}

export interface InternalDependency {
  from: string;
  to: string;
  type: 'import' | 'require' | 'reference';
  usage: 'function' | 'class' | 'variable' | 'type' | 'module';
}

export interface ExternalDependency {
  name: string;
  version?: string;
  type: 'dependency' | 'devDependency' | 'peerDependency';
  usageCount: number;
  files: string[];
}

export interface CircularDependency {
  cycle: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface CodePatterns {
  designPatterns: DesignPattern[];
  namingConventions: NamingConvention[];
  codeStyles: CodeStyle[];
  antiPatterns: AntiPattern[];
}

export interface DesignPattern {
  name: string;
  files: string[];
  confidence: number;
  description: string;
}

export interface NamingConvention {
  type: 'function' | 'variable' | 'class' | 'file' | 'directory';
  pattern: string;
  examples: string[];
  consistency: number;
}

export interface CodeStyle {
  aspect: 'indentation' | 'quotes' | 'semicolons' | 'braces' | 'spacing';
  style: string;
  consistency: number;
}

export interface AntiPattern {
  type: string;
  files: string[];
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
}

export interface CodebaseMetrics {
  complexity: ComplexityMetrics;
  maintainability: MaintainabilityMetrics;
  testCoverage: TestCoverageMetrics;
  performance: PerformanceMetrics;
}

export interface ComplexityMetrics {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  nestingDepth: number;
  functionLength: number;
  classSize: number;
}

export interface MaintainabilityMetrics {
  duplicatedLines: number;
  duplicatedBlocks: number;
  maintainabilityIndex: number;
  technicalDebtRatio: number;
}

export interface TestCoverageMetrics {
  linesCovered: number;
  totalLines: number;
  branchesCovered: number;
  totalBranches: number;
  testFiles: string[];
  uncoveredFiles: string[];
}

export interface PerformanceMetrics {
  bundleSize: number;
  loadTime: number;
  memoryUsage: number;
  hotspots: PerformanceHotspot[];
}

export interface PerformanceHotspot {
  file: string;
  function: string;
  type: 'cpu' | 'memory' | 'io';
  severity: number;
}

export interface FileRelationships {
  clusters: FileCluster[];
  isolatedFiles: string[];
  coreFiles: string[];
  utilityFiles: string[];
}

export interface FileCluster {
  name: string;
  files: string[];
  cohesion: number;
  coupling: number;
}

export interface ProjectDocumentation {
  readme: DocumentationQuality;
  comments: CommentAnalysis;
  typeDefinitions: TypeDefinitionAnalysis;
  apiDocumentation: APIDocumentationAnalysis;
}

export interface DocumentationQuality {
  exists: boolean;
  completeness: number;
  clarity: number;
  upToDate: boolean;
}

export interface CommentAnalysis {
  ratio: number;
  quality: number;
  outdated: string[];
  missing: string[];
}

export interface TypeDefinitionAnalysis {
  coverage: number;
  quality: number;
  missingTypes: string[];
}

export interface APIDocumentationAnalysis {
  endpoints: number;
  documented: number;
  examples: number;
  upToDate: boolean;
}

export interface TechnicalDebt {
  type:
    | 'code_smell'
    | 'bug_risk'
    | 'security_issue'
    | 'performance_issue'
    | 'maintainability_issue';
  file: string;
  line?: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  effort: 'trivial' | 'easy' | 'medium' | 'hard' | 'complex';
  impact: 'low' | 'medium' | 'high';
}

export interface ArchitectureInsights {
  patterns: ArchitecturePattern[];
  layers: ArchitectureLayer[];
  modules: ArchitectureModule[];
  dataFlow: DataFlowAnalysis;
  recommendations: ArchitectureRecommendation[];
}

export interface ArchitecturePattern {
  name: string;
  confidence: number;
  description: string;
  files: string[];
}

export interface ArchitectureLayer {
  name: string;
  files: string[];
  dependencies: string[];
  violations: string[];
}

export interface ArchitectureModule {
  name: string;
  files: string[];
  interfaces: string[];
  cohesion: number;
  coupling: number;
}

export interface DataFlowAnalysis {
  sources: string[];
  sinks: string[];
  transformations: string[];
  bottlenecks: string[];
}

export interface ArchitectureRecommendation {
  type: 'refactor' | 'extract' | 'merge' | 'restructure';
  description: string;
  files: string[];
  benefit: string;
  effort: 'low' | 'medium' | 'high';
}

export interface LanguageDistribution {
  language: string;
  files: number;
  lines: number;
  percentage: number;
}
