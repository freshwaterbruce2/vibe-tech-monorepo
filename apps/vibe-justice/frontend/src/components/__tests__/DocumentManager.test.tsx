import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentManager } from '../DocumentManager';
import type { CompleteAnalysisResponse } from '../types/documentAnalysis';

// Mock dependencies - use vi.hoisted() to make mocks available in factory functions
const { mockTauriAPI, mockIsTauri } = vi.hoisted(() => ({
  mockTauriAPI: {
    openFileDialog: vi.fn(),
    readFile: vi.fn(), // Changed from readTextFile to match actual API
    saveFileDialog: vi.fn(),
    writeFile: vi.fn(),
  },
  mockIsTauri: vi.fn(),
}));

const { mockDocumentAnalysisApi } = vi.hoisted(() => ({
  mockDocumentAnalysisApi: {
    completeAnalysis: vi.fn(),
  },
}));

// Mock the module - use ../../ since test is in __tests__ subdirectory
vi.mock('../../services/tauri', () => ({
  tauriAPI: mockTauriAPI,
  isTauri: mockIsTauri,
}));

// Mock documentAnalysis service
vi.mock('../../services/documentAnalysis', () => ({
  documentAnalysisApi: mockDocumentAnalysisApi,
}));

// Wave 1C: DocumentManager posts via the centralized axios `httpClient`.
// Mock the client rather than axios itself so we don't have to reproduce
// axios.create/interceptors internals. Using vi.hoisted so the mock post
// reference is available inside the module factory (vi.mock is hoisted).
const { mockHttpPost } = vi.hoisted(() => ({
  mockHttpPost: vi.fn(),
}));

vi.mock('../../services/httpClient', () => ({
  httpClient: {
    get: vi.fn(),
    post: mockHttpPost,
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('DocumentManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock window.alert (not implemented in JSDOM)
    global.alert = vi.fn();

    // Default to web mode (isTauri returns false)
    mockIsTauri.mockReturnValue(false);

    // Default httpClient mock response for file uploads
    mockHttpPost.mockResolvedValue({
      data: {
        success: true,
        documents: [{
          filename: 'test.txt',
          text_content: 'Test content extracted'
        }],
        message: 'Upload successful'
      }
    });
  });

  describe('Rendering and initialization', () => {
    it('renders the component with default view mode (single)', () => {
      render(<DocumentManager />);

      expect(screen.getByText(/Legal Document Analysis/i)).toBeInTheDocument();
      expect(screen.getByText(/Upload documents for analysis/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Upload Document/i })).toBeInTheDocument();
    });

    it('renders empty state when no documents uploaded', () => {
      render(<DocumentManager />);

      expect(screen.getByText(/No documents uploaded/i)).toBeInTheDocument();
    });
  });

  describe('File upload - Web mode', () => {
    it('allows file upload via input in web mode', async () => {
      const user = userEvent.setup();
      render(<DocumentManager />);

      const file = new File(['test content'], 'test-document.txt', { type: 'text/plain' });
      const uploadButton = screen.getByRole('button', { name: /Upload Document/i });

      await user.click(uploadButton);

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();

      // Simulate file selection
      await user.upload(fileInput, file);

      await waitFor(() => {
        expect(screen.getByText(/test-document.txt/i)).toBeInTheDocument();
      });
    });

    it('handles multiple file upload in web mode', async () => {
      render(<DocumentManager />);

      const file1 = new File(['content 1'], 'doc1.txt', { type: 'text/plain' });
      const file2 = new File(['content 2'], 'doc2.txt', { type: 'text/plain' });

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      // Simulate file selection using fireEvent
      fireEvent.change(fileInput, {
        target: { files: [file1, file2] }
      });

      await waitFor(() => {
        expect(screen.getByText(/doc1.txt/i)).toBeInTheDocument();
        expect(screen.getByText(/doc2.txt/i)).toBeInTheDocument();
      });
    });

    it('shows error for unsupported file types in web mode', async () => {
      render(<DocumentManager />);

      const unsupportedFile = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });

      // Get file input directly
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      // Simulate file selection using fireEvent
      fireEvent.change(fileInput, {
        target: { files: [unsupportedFile] }
      });

      await waitFor(() => {
        expect(screen.getByText(/unsupported file type/i)).toBeInTheDocument();
      });
    });
  });

  describe('File upload - Tauri mode', () => {
    it('uses Tauri file dialog in Tauri mode', async () => {
      const user = userEvent.setup();

      // Enable Tauri mode for this test
      mockIsTauri.mockReturnValue(true);
      mockTauriAPI.openFileDialog.mockResolvedValueOnce(['C:\\test\\document.pdf']);
      mockTauriAPI.readFile.mockResolvedValueOnce('Test PDF content extracted');

      render(<DocumentManager />);

      const uploadButton = screen.getByRole('button', { name: /Upload Document/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(mockTauriAPI.openFileDialog).toHaveBeenCalledWith({
          title: 'Select Documents to Upload',
          multiple: true,
          filters: [
            { name: 'Documents', extensions: ['pdf', 'docx', 'txt'] },
            { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] },
            { name: 'All Files', extensions: ['*'] }
          ],
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/document.pdf/i)).toBeInTheDocument();
      });
    });

    it('handles Tauri file read errors', async () => {
      const user = userEvent.setup();

      // Enable Tauri mode
      mockIsTauri.mockReturnValue(true);
      mockTauriAPI.openFileDialog.mockResolvedValueOnce(['C:\\test\\corrupted.pdf']);
      mockTauriAPI.readFile.mockRejectedValueOnce(new Error('Failed to read file'));

      render(<DocumentManager />);

      const uploadButton = screen.getByRole('button', { name: /Upload Document/i });
      await user.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText(/error.*file/i)).toBeInTheDocument();
      });
    });
  });

  describe('Document analysis', () => {
    it('successfully analyzes a document and displays results', async () => {
      const user = userEvent.setup();
      const mockAnalysisResult: CompleteAnalysisResponse = {
        violations: [
          {
            type: 'Contract breach',
            statute: 'SC Code § 41-35-120',
            severity: 'HIGH',
            evidence: 'Party A failed to deliver goods',
            pageNumber: 1,
            recommendedAction: 'File breach of contract claim',
          },
        ],
        dates: [
          {
            date: '2024-01-15',
            label: 'Contract signing date',
            importance: 'HIGH',
            source: 'Contract document',
            context: 'Agreement effective date',
            days_remaining: 30,
            is_urgent: false,
          },
        ],
        contradictions: [],
        summary: {
          total_violations: 1,
          critical_violations: 0,
          total_dates: 1,
          urgent_dates: 0,
          total_contradictions: 0,
          case_strength: 'MODERATE',
        },
      };

      mockDocumentAnalysisApi.completeAnalysis.mockResolvedValueOnce(
        mockAnalysisResult
      );

      render(<DocumentManager />);

      // Upload a file first
      const file = new File(['contract content'], 'contract.txt', { type: 'text/plain' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      // Simulate file selection using fireEvent
      fireEvent.change(fileInput, {
        target: { files: [file] }
      });

      await waitFor(() => {
        expect(screen.getByText(/contract.txt/i)).toBeInTheDocument();
      });

      // Click analyze button
      const analyzeButton = screen.getByRole('button', { name: /Analyze/i });
      await user.click(analyzeButton);

      await waitFor(() => {
        expect(mockDocumentAnalysisApi.completeAnalysis).toHaveBeenCalledWith({
          documents: [
            {
              filename: 'contract.txt',
              text_content: 'contract content',
            },
          ],
          case_type: expect.any(String),
        });
      });

      await waitFor(() => {
        expect(screen.getByText(/Case Strength Assessment/i)).toBeInTheDocument();
        expect(screen.getAllByText(/MODERATE/i)[0]).toBeInTheDocument();
        expect(screen.getByText(/Contract breach/i)).toBeInTheDocument();
        expect(screen.getAllByText(/HIGH/i)[0]).toBeInTheDocument();
      });
    });

    it('handles analysis API errors gracefully', async () => {
      const user = userEvent.setup();
      mockDocumentAnalysisApi.completeAnalysis.mockRejectedValueOnce(
        new Error('API rate limit exceeded')
      );

      render(<DocumentManager />);

      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, {
        target: { files: [file] }
      });

      // Small delay to stabilize flaky environment
      await new Promise(resolve => setTimeout(resolve, 100));

      await screen.findByText(/test.txt/i);

      const analyzeButton = screen.getByRole('button', { name: /Analyze/i });
      await user.click(analyzeButton);

      expect(await screen.findByText(/API rate limit exceeded/i)).toBeInTheDocument();
    });

    it('disables analyze button while analysis is in progress', async () => {
      // Create a promise that we control
      let resolveAnalysis: (value: CompleteAnalysisResponse) => void;
      const analysisPromise = new Promise<CompleteAnalysisResponse>((resolve) => {
        resolveAnalysis = resolve;
      });
      
      mockDocumentAnalysisApi.completeAnalysis.mockReturnValueOnce(analysisPromise);

      render(<DocumentManager />);

      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, {
        target: { files: [file] }
      });

      // Small delay to stabilize flaky environment
      await new Promise(resolve => setTimeout(resolve, 100));

      await screen.findByText(/test.txt/i);

      const analyzeButton = screen.getByRole('button', { name: /Analyze/i });
      
      // Use fireEvent to trigger click without awaiting the entire async chain
      // This allows us to check the state while analysis is "in progress"
      fireEvent.click(analyzeButton);

      // It should be disabled immediately
      await waitFor(() => {
        expect(analyzeButton).toBeDisabled();
      });
      expect(screen.getByText(/Analyzing document/i)).toBeInTheDocument();

      // Now resolve it to clean up
      await act(async () => {
        resolveAnalysis!({
          violations: [],
          dates: [],
          contradictions: [],
          summary: { 
            total_violations: 0, 
            critical_violations: 0, 
            total_dates: 0, 
            urgent_dates: 0, 
            total_contradictions: 0, 
            case_strength: 'WEAK' 
          }
        });
      });
      
      // Should be enabled again (or gone if results show)
      await waitFor(() => {
        expect(screen.queryByText(/Analyzing document/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Export functionality', () => {
    it('exports analysis results to PDF in Tauri mode', async () => {
      const user = userEvent.setup();

      // Enable Tauri mode
      mockIsTauri.mockReturnValue(true);
      mockTauriAPI.saveFileDialog.mockResolvedValueOnce('C:\\exports\\analysis.pdf');
      mockTauriAPI.writeFile.mockResolvedValueOnce();

      const mockAnalysisResult: CompleteAnalysisResponse = {
        violations: [],
        dates: [],
        contradictions: [],
        summary: {
          total_violations: 0,
          critical_violations: 0,
          total_dates: 0,
          urgent_dates: 0,
          total_contradictions: 0,
          case_strength: 'WEAK',
        },
      };

      mockDocumentAnalysisApi.completeAnalysis.mockResolvedValueOnce(
        mockAnalysisResult
      );

      render(<DocumentManager />);

      // Upload and analyze
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, {
        target: { files: [file] }
      });

      // Small delay to stabilize flaky environment
      await new Promise(resolve => setTimeout(resolve, 100));

      await screen.findByText(/test.txt/i);

      const analyzeButton = await screen.findByRole('button', { name: /Analyze/i });
      await user.click(analyzeButton);

      await screen.findByText(/Case Strength Assessment/i);
      expect(screen.getByText(/WEAK/i)).toBeInTheDocument();

      // Export to PDF
      const exportButton = screen.getByRole('button', { name: /Export.*PDF/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(mockTauriAPI.saveFileDialog).toHaveBeenCalledWith({
          title: 'Save Analysis Report',
          defaultPath: expect.stringContaining('.pdf'),
          filters: [
            {
              name: 'PDF',
              extensions: ['pdf'],
            },
          ],
        });
      });

      await waitFor(() => {
        expect(mockTauriAPI.writeFile).toHaveBeenCalledWith(
          'C:\\exports\\analysis.pdf',
          expect.any(String)
        );
      });
    });

    it('handles export errors', async () => {
      const user = userEvent.setup();

      // Enable Tauri mode
      mockIsTauri.mockReturnValue(true);
      mockTauriAPI.saveFileDialog.mockResolvedValueOnce('C:\\exports\\analysis.pdf');
      mockTauriAPI.writeFile.mockRejectedValueOnce(new Error('Write failed'));

      const mockAnalysisResult: CompleteAnalysisResponse = {
        violations: [],
        dates: [],
        contradictions: [],
        summary: {
          total_violations: 0,
          critical_violations: 0,
          total_dates: 0,
          urgent_dates: 0,
          total_contradictions: 0,
          case_strength: 'WEAK',
        },
      };

      mockDocumentAnalysisApi.completeAnalysis.mockResolvedValueOnce(
        mockAnalysisResult
      );

      render(<DocumentManager />);

      // Upload and analyze
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      fireEvent.change(fileInput, {
        target: { files: [file] }
      });

      // Small delay to stabilize flaky environment
      await new Promise(resolve => setTimeout(resolve, 100));

      await screen.findByText(/test.txt/i);

      const analyzeButton = await screen.findByRole('button', { name: /Analyze/i });
      await user.click(analyzeButton);

      await screen.findByText(/Case Strength Assessment/i);

      const exportButton = screen.getByRole('button', { name: /Export.*PDF/i });
      await user.click(exportButton);

      expect(await screen.findByText(/Write failed/i)).toBeInTheDocument();
    });
  });

  describe('Document management', () => {
    it('deletes a document from the list', async () => {
      const user = userEvent.setup();
      render(<DocumentManager />);

      const file = new File(['content'], 'to-delete.txt', { type: 'text/plain' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      // Simulate file selection using fireEvent
      fireEvent.change(fileInput, {
        target: { files: [file] }
      });

      await waitFor(() => {
        expect(screen.getByText(/to-delete.txt/i)).toBeInTheDocument();
      });

      const deleteButton = screen.getByRole('button', { name: /Delete/i });
      await user.click(deleteButton);

      await waitFor(() => {
        expect(screen.queryByText(/to-delete.txt/i)).not.toBeInTheDocument();
      });
    });

    it('selects a document when clicked', async () => {
      const user = userEvent.setup();
      render(<DocumentManager />);

      const file1 = new File(['content 1'], 'doc1.txt', { type: 'text/plain' });
      const file2 = new File(['content 2'], 'doc2.txt', { type: 'text/plain' });

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;

      // Simulate file selection using fireEvent
      fireEvent.change(fileInput, {
        target: { files: [file1, file2] }
      });

      await waitFor(() => {
        expect(screen.getByText(/doc1.txt/i)).toBeInTheDocument();
        expect(screen.getByText(/doc2.txt/i)).toBeInTheDocument();
      });

      // Click on second document
      const doc2Element = screen.getByText(/doc2.txt/i);
      await user.click(doc2Element);

      // Verify doc2 is selected (would typically check for active/selected class)
      expect(doc2Element.closest('.document-item')).toHaveClass('selected');
    });
  });

  describe('View mode switching', () => {
    it('switches between single and batch view modes', async () => {
      const user = userEvent.setup();
      render(<DocumentManager />);

      // Initially in single mode
      expect(screen.getByText(/Single Document Mode/i)).toBeInTheDocument();

      // Find and click batch mode toggle
      const batchModeToggle = screen.getByRole('button', { name: /Batch Mode/i });
      await user.click(batchModeToggle);

      await waitFor(() => {
        expect(screen.getByText(/Batch Processing Mode/i)).toBeInTheDocument();
      });

      // Switch back to single mode
      const singleModeToggle = screen.getByRole('button', { name: /Single Mode/i });
      await user.click(singleModeToggle);

      await waitFor(() => {
        expect(screen.getByText(/Single Document Mode/i)).toBeInTheDocument();
      });
    });
  });
});