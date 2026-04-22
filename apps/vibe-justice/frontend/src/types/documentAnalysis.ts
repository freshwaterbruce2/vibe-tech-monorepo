/**
 * TypeScript interfaces for Vibe-Justice Document Analysis Feature
 *
 * Matches backend Pydantic models from:
 * - backend/vibe_justice/services/document_processor_service.py
 * - backend/vibe_justice/services/violation_detector_service.py
 * - backend/vibe_justice/services/date_extractor_service.py
 * - backend/vibe_justice/services/contradiction_detector_service.py
 * - backend/vibe_justice/api/document_analysis.py
 */

// ========================================
// Document Processing
// ========================================

export interface ProcessedDocument {
  filename: string;
  file_type: string;
  text_content: string;
  page_count?: number;
  word_count?: number;
  error?: string;
}

export interface DocumentUploadResponse {
  success: boolean;
  documents: ProcessedDocument[];
  message: string;
}

// ========================================
// Violations Detection
// ========================================

export type ViolationSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface Violation {
  type: string;
  statute: string;
  severity: ViolationSeverity;
  evidence: string;
  pageNumber: number | null;
  recommendedAction: string;
}

export interface ViolationsResponse {
  violations: Violation[];
  count: number;
}

// ========================================
// Date Extraction
// ========================================

export type DateImportance = 'CRITICAL' | 'HIGH' | 'MEDIUM';

export interface CriticalDate {
  date: string; // ISO 8601 format
  label: string;
  importance: DateImportance;
  source: string;
  context: string;
  days_remaining: number;
  is_urgent: boolean;
}

export interface DatesResponse {
  dates: CriticalDate[];
  count: number;
  urgent_count: number;
}

// ========================================
// Contradiction Detection
// ========================================

export type ContradictionSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM';

export interface Contradiction {
  statement1: string;
  source1: string;
  statement2: string;
  source2: string;
  severity: ContradictionSeverity;
  impact: string;
  rebuttal: string;
}

export interface ContradictionsResponse {
  contradictions: Contradiction[];
  count: number;
}

// ========================================
// Complete Analysis
// ========================================

export type CaseStrength = 'STRONG' | 'MODERATE' | 'WEAK';

export interface AnalysisSummary {
  total_violations: number;
  critical_violations: number;
  total_dates: number;
  urgent_dates: number;
  total_contradictions: number;
  case_strength: CaseStrength;
}

export interface CompleteAnalysisResponse {
  violations: Violation[];
  dates: CriticalDate[];
  contradictions: Contradiction[];
  summary: AnalysisSummary;
}

// ========================================
// Case Types
// ========================================

export type CaseType = 'employment_law' | 'family_law' | 'estate_law';

export const CASE_TYPE_LABELS: Record<CaseType, string> = {
  employment_law: 'Employment Law (Walmart/Sedgwick/Unemployment)',
  family_law: 'Family Law (Custody/Support/Divorce)',
  estate_law: 'Estate Law (Probate/Will/Inheritance)',
};

export const CASE_TYPE_DESCRIPTIONS: Record<CaseType, string> = {
  employment_law: 'Walmart terminations, Sedgwick claims, SC unemployment appeals, progressive discipline violations',
  family_law: 'Child custody/support, divorce, separation, parenting plans, SC family court matters',
  estate_law: 'Probate filings, will contests, intestate succession, executor duties, creditor claims',
};

// ========================================
// Request Types
// ========================================

export interface AnalyzeViolationsRequest {
  documents: { filename: string; text_content: string }[];
  case_type?: CaseType;
}

export interface AnalyzeDatesRequest {
  documents: { filename: string; text_content: string }[];
}

export interface AnalyzeContradictionsRequest {
  documents: { filename: string; text_content: string }[];
}

export interface CompleteAnalysisRequest {
  documents: { filename: string; text_content: string }[];
  case_type?: CaseType;
}

// ========================================
// UI State Types
// ========================================

export interface AnalysisState {
  isAnalyzing: boolean;
  hasAnalyzed: boolean;
  error: string | null;
  violations: Violation[];
  dates: CriticalDate[];
  contradictions: Contradiction[];
  summary: AnalysisSummary | null;
}

export interface UploadState {
  isUploading: boolean;
  uploadProgress: number;
  uploadedDocuments: ProcessedDocument[];
  uploadError: string | null;
}

// ========================================
// Utility Types
// ========================================

export interface SeverityConfig {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}

export const SEVERITY_COLORS: Record<ViolationSeverity, SeverityConfig> = {
  CRITICAL: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
    icon: 'AlertCircle',
  },
  HIGH: {
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/30',
    icon: 'AlertTriangle',
  },
  MEDIUM: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30',
    icon: 'Info',
  },
  LOW: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    icon: 'CheckCircle',
  },
};

export const IMPORTANCE_COLORS: Record<DateImportance, SeverityConfig> = {
  CRITICAL: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
    icon: 'Calendar',
  },
  HIGH: {
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
    borderColor: 'border-amber-500/30',
    icon: 'Clock',
  },
  MEDIUM: {
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/30',
    icon: 'CalendarDays',
  },
};

export const CASE_STRENGTH_COLORS: Record<CaseStrength, SeverityConfig> = {
  STRONG: {
    color: 'text-green-400',
    bgColor: 'bg-green-500/20',
    borderColor: 'border-green-500/30',
    icon: 'TrendingUp',
  },
  MODERATE: {
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/30',
    icon: 'Minus',
  },
  WEAK: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
    icon: 'TrendingDown',
  },
};

// ========================================
// Batch Upload (NEW - Phone Photos Support)
// ========================================

export interface BatchFileResult {
  filename: string;
  file_type: string;
  success: boolean;
  text_content: string;
  ocr_quality: 'high' | 'medium' | 'low' | null;
  ocr_confidence: number | null;
  page_count: number;
  word_count: number;
  processing_time: number;
  error: string | null;
}

export interface BatchUploadResponse {
  batch_id: string;
  total_files: number;
  successful_files: number;
  failed_files: number;
  file_results: BatchFileResult[];
  violations: Violation[];
  dates: CriticalDate[];
  contradictions: Contradiction[];
  total_processing_time: number;
  summary: {
    total_violations: number;
    critical_violations: number;
    total_dates: number;
    urgent_dates: number;
    total_contradictions: number;
  };
}

export interface SupportedFormatsResponse {
  images: string[];
  documents: string[];
  max_files: number;
  max_file_size_mb: number;
  case_types: CaseType[];
  features: {
    ocr: string;
    phone_photos: string;
    multi_page_pdf: string;
    ai_analysis: string;
  };
}
