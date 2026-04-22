import { describe, it, expect, beforeEach, vi } from 'vitest';
import { documentAnalysisApi, DocumentAnalysisError, prepareDocumentsForAnalysis } from '../documentAnalysis';
import type { AnalyzeViolationsRequest, AnalyzeDatesRequest, AnalyzeContradictionsRequest, CompleteAnalysisRequest } from '../../types/documentAnalysis';

// Mock fetch globally
global.fetch = vi.fn();

describe('documentAnalysisApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadDocuments', () => {
    it('should upload valid PDF file successfully', async () => {
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const mockResponse = {
        documents: [
          {
            filename: 'test.pdf',
            text_content: 'extracted text',
            pages: 1
          }
        ]
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await documentAnalysisApi.uploadDocuments([mockFile]);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/document-analysis/upload'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should reject files over 10MB', async () => {
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', { type: 'application/pdf' });

      await expect(documentAnalysisApi.uploadDocuments([largeFile])).rejects.toThrow(
        'File too large: large.pdf. Maximum size is 10MB.'
      );
    });

    it('should reject invalid file types', async () => {
      const invalidFile = new File(['test'], 'test.exe', { type: 'application/octet-stream' });

      await expect(documentAnalysisApi.uploadDocuments([invalidFile])).rejects.toThrow(
        'Invalid file type: test.exe. Only PDF, DOCX, and TXT files are supported.'
      );
    });

    it('should throw error when no files provided', async () => {
      await expect(documentAnalysisApi.uploadDocuments([])).rejects.toThrow(
        'No files provided for upload'
      );
    });

    it('should handle API error responses', async () => {
      const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ detail: 'Processing failed' }),
      } as Response);

      await expect(documentAnalysisApi.uploadDocuments([mockFile])).rejects.toThrow(
        'Processing failed'
      );
    });
  });

  describe('analyzeViolations', () => {
    it('should analyze violations successfully', async () => {
      const request: AnalyzeViolationsRequest = {
        documents: [
          { filename: 'doc1.pdf', text_content: 'violation text' }
        ],
        case_type: 'unemployment'
      };

      const mockResponse = {
        violations: [
          {
            title: 'Missing deadline',
            severity: 'high',
            statute: 'SC Code 41-35-120',
            description: 'Deadline violation',
            recommended_action: 'File appeal immediately'
          }
        ]
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await documentAnalysisApi.analyzeViolations(request);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/analyze/violations'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('should throw error when no documents provided', async () => {
      const request: AnalyzeViolationsRequest = {
        documents: [],
        case_type: 'unemployment'
      };

      await expect(documentAnalysisApi.analyzeViolations(request)).rejects.toThrow(
        'No documents provided for violation analysis'
      );
    });

    it('should default to unemployment case type', async () => {
      const request: AnalyzeViolationsRequest = {
        documents: [{ filename: 'doc1.pdf', text_content: 'text' }]
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ violations: [] }),
      } as Response);

      await documentAnalysisApi.analyzeViolations(request);

      const fetchCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.case_type).toBe('unemployment');
    });
  });

  describe('analyzeDates', () => {
    it('should extract dates successfully', async () => {
      const request: AnalyzeDatesRequest = {
        documents: [
          { filename: 'doc1.pdf', text_content: 'hearing on 2024-12-31' }
        ]
      };

      const mockResponse = {
        dates: [
          {
            date: '2024-12-31',
            label: 'Hearing date',
            importance: 'high',
            days_remaining: 10,
            in_past: false
          }
        ]
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await documentAnalysisApi.analyzeDates(request);

      expect(result).toEqual(mockResponse);
    });

    it('should throw error when no documents provided', async () => {
      const request: AnalyzeDatesRequest = {
        documents: []
      };

      await expect(documentAnalysisApi.analyzeDates(request)).rejects.toThrow(
        'No documents provided for date extraction'
      );
    });
  });

  describe('analyzeContradictions', () => {
    it('should find contradictions successfully', async () => {
      const request: AnalyzeContradictionsRequest = {
        documents: [
          { filename: 'doc1.pdf', text_content: 'statement A' },
          { filename: 'doc2.pdf', text_content: 'statement B' }
        ]
      };

      const mockResponse = {
        contradictions: [
          {
            document1: 'doc1.pdf',
            statement1: 'statement A',
            document2: 'doc2.pdf',
            statement2: 'statement B',
            impact: 'high',
            rebuttal: 'suggested rebuttal'
          }
        ]
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await documentAnalysisApi.analyzeContradictions(request);

      expect(result).toEqual(mockResponse);
    });

    it('should require at least 2 documents', async () => {
      const request: AnalyzeContradictionsRequest = {
        documents: [{ filename: 'doc1.pdf', text_content: 'text' }]
      };

      await expect(documentAnalysisApi.analyzeContradictions(request)).rejects.toThrow(
        'At least 2 documents required for contradiction analysis'
      );
    });
  });

  describe('completeAnalysis', () => {
    it('should run complete analysis successfully', async () => {
      const request: CompleteAnalysisRequest = {
        documents: [
          { filename: 'doc1.pdf', text_content: 'full text' }
        ],
        case_type: 'sedgwick'
      };

      const mockResponse = {
        violations: [],
        dates: [],
        contradictions: [],
        summary: 'Analysis complete'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await documentAnalysisApi.completeAnalysis(request);

      expect(result).toEqual(mockResponse);
    });

    it('should throw error when no documents provided', async () => {
      const request: CompleteAnalysisRequest = {
        documents: [],
        case_type: 'unemployment'
      };

      await expect(documentAnalysisApi.completeAnalysis(request)).rejects.toThrow(
        'No documents provided for complete analysis'
      );
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      const mockResponse = {
        status: 'healthy',
        service: 'document-analysis'
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await documentAnalysisApi.healthCheck();

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.objectContaining({ method: 'GET' })
      );
    });
  });

  describe('DocumentAnalysisError', () => {
    it('should create error with all properties', () => {
      const error = new DocumentAnalysisError('test message', 500, { detail: 'extra' });

      expect(error.message).toBe('test message');
      expect(error.name).toBe('DocumentAnalysisError');
      expect(error.statusCode).toBe(500);
      expect(error.details).toEqual({ detail: 'extra' });
    });
  });

  describe('prepareDocumentsForAnalysis', () => {
    it('should prepare documents correctly', () => {
      const input = [
        { filename: 'doc1.pdf', text_content: 'text1' },
        { filename: 'doc2.pdf', text_content: 'text2' }
      ];

      const result = prepareDocumentsForAnalysis(input);

      expect(result).toEqual(input);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('filename');
      expect(result[0]).toHaveProperty('text_content');
    });

    it('should handle empty array', () => {
      const result = prepareDocumentsForAnalysis([]);

      expect(result).toEqual([]);
    });
  });
});
