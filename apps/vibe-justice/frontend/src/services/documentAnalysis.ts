/**
 * API Service for Document Analysis
 *
 * Connects to FastAPI backend endpoints:
 * - POST /api/document-analysis/upload
 * - POST /api/document-analysis/analyze/violations
 * - POST /api/document-analysis/analyze/dates
 * - POST /api/document-analysis/analyze/contradictions
 * - POST /api/document-analysis/analyze/complete
 */

import type {
  DocumentUploadResponse,
  ViolationsResponse,
  DatesResponse,
  ContradictionsResponse,
  CompleteAnalysisResponse,
  AnalyzeViolationsRequest,
  AnalyzeDatesRequest,
  AnalyzeContradictionsRequest,
  CompleteAnalysisRequest,
} from '../types/documentAnalysis';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const ANALYSIS_PREFIX = '/api/document-analysis';

const authHeaders = (): HeadersInit => {
  const apiKey = import.meta.env.VITE_VIBE_JUSTICE_API_KEY;
  return apiKey ? { 'X-API-Key': apiKey } : {};
};

const jsonHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  ...authHeaders(),
});

/**
 * Custom error class for document analysis API errors
 */
export class DocumentAnalysisError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'DocumentAnalysisError';
  }
}

/**
 * Helper function to handle API responses
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    let errorDetails: unknown;

    try {
      const errorData = await response.json();
      errorMessage = errorData.detail || errorData.message || errorMessage;
      errorDetails = errorData;
    } catch {
      // If response is not JSON, use status text
      errorMessage = `API Error: ${response.status} ${response.statusText}`;
    }

    throw new DocumentAnalysisError(errorMessage, response.status, errorDetails);
  }

  return response.json();
}

/**
 * Document Analysis API Client
 */
export const documentAnalysisApi = {
  /**
   * Upload and process documents (PDF, DOCX, TXT)
   *
   * @param files - Array of File objects to upload
   * @returns Processed documents with extracted text
   */
  async uploadDocuments(files: File[]): Promise<DocumentUploadResponse> {
    if (!files || files.length === 0) {
      throw new DocumentAnalysisError('No files provided for upload');
    }

    // Validate file types
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    const allowedExtensions = ['.pdf', '.docx', '.txt'];

    for (const file of files) {
      const hasValidType = allowedTypes.includes(file.type);
      const hasValidExtension = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

      if (!hasValidType && !hasValidExtension) {
        throw new DocumentAnalysisError(
          `Invalid file type: ${file.name}. Only PDF, DOCX, and TXT files are supported.`
        );
      }

      // Check file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new DocumentAnalysisError(
          `File too large: ${file.name}. Maximum size is 10MB.`
        );
      }
    }

    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await fetch(`${API_BASE}${ANALYSIS_PREFIX}/upload`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });

    return handleResponse<DocumentUploadResponse>(response);
  },

  /**
   * Analyze documents for legal violations
   *
   * @param request - Documents to analyze with optional case type
   * @returns Detected violations with severity, statute citations, and recommended actions
   */
  async analyzeViolations(
    request: AnalyzeViolationsRequest
  ): Promise<ViolationsResponse> {
    if (!request.documents || request.documents.length === 0) {
      throw new DocumentAnalysisError('No documents provided for violation analysis');
    }

    const response = await fetch(`${API_BASE}${ANALYSIS_PREFIX}/analyze/violations`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        documents: request.documents,
        case_type: request.case_type || 'unemployment',
      }),
    });

    return handleResponse<ViolationsResponse>(response);
  },

  /**
   * Extract critical dates and deadlines from documents
   *
   * @param request - Documents to analyze for dates
   * @returns Critical dates with labels, importance, and days remaining
   */
  async analyzeDates(request: AnalyzeDatesRequest): Promise<DatesResponse> {
    if (!request.documents || request.documents.length === 0) {
      throw new DocumentAnalysisError('No documents provided for date extraction');
    }

    const response = await fetch(`${API_BASE}${ANALYSIS_PREFIX}/analyze/dates`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        documents: request.documents,
      }),
    });

    return handleResponse<DatesResponse>(response);
  },

  /**
   * Find contradictions between multiple documents
   *
   * @param request - Documents to compare for contradictions
   * @returns Contradictions with side-by-side statements, impact, and rebuttal
   */
  async analyzeContradictions(
    request: AnalyzeContradictionsRequest
  ): Promise<ContradictionsResponse> {
    if (!request.documents || request.documents.length < 2) {
      throw new DocumentAnalysisError(
        'At least 2 documents required for contradiction analysis'
      );
    }

    const response = await fetch(`${API_BASE}${ANALYSIS_PREFIX}/analyze/contradictions`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        documents: request.documents,
      }),
    });

    return handleResponse<ContradictionsResponse>(response);
  },

  /**
   * Run complete analysis (violations + dates + contradictions)
   *
   * @param request - Documents to analyze with optional case type
   * @returns Complete analysis with all findings and summary
   */
  async completeAnalysis(
    request: CompleteAnalysisRequest
  ): Promise<CompleteAnalysisResponse> {
    if (!request.documents || request.documents.length === 0) {
      throw new DocumentAnalysisError('No documents provided for complete analysis');
    }

    const response = await fetch(`${API_BASE}${ANALYSIS_PREFIX}/analyze/complete`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        documents: request.documents,
        case_type: request.case_type || 'unemployment',
      }),
    });

    return handleResponse<CompleteAnalysisResponse>(response);
  },

  /**
   * Health check for document analysis service
   *
   * @returns Service health status
   */
  async healthCheck(): Promise<{ status: string; service: string }> {
    const response = await fetch(`${API_BASE}${ANALYSIS_PREFIX}/health`, {
      method: 'GET',
    });

    return handleResponse<{ status: string; service: string }>(response);
  },
};

/**
 * Helper function to prepare documents for analysis
 *
 * Converts ProcessedDocument[] to format expected by analysis endpoints
 */
export function prepareDocumentsForAnalysis(
  documents: Array<{ filename: string; text_content: string }>
): Array<{ filename: string; text_content: string }> {
  return documents.map(doc => ({
    filename: doc.filename,
    text_content: doc.text_content,
  }));
}
