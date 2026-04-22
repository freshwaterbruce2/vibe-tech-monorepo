/**
 * DocumentUploader Component
 *
 * Drag-and-drop file upload with multi-file support
 * Supports PDF, DOCX, and TXT files (max 10MB each)
 *
 * Pattern: Based on EvidenceUpload.tsx and DocumentManager.tsx
 */

import { useState, useRef, useCallback } from 'react';
import { Upload, X, FileText, Loader2, AlertCircle } from 'lucide-react';
import { documentAnalysisApi, DocumentAnalysisError } from '../../services/documentAnalysis';
import type { ProcessedDocument } from '../../types/documentAnalysis';

interface DocumentUploaderProps {
  onUploadComplete: (documents: ProcessedDocument[]) => void;
  onUploadError?: (error: string) => void;
  maxFiles?: number;
}

export default function DocumentUploader({
  onUploadComplete,
  onUploadError,
  maxFiles = 10,
}: DocumentUploaderProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handle file selection from input or drag-and-drop
   */
  const handleFilesSelected = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;

      // Convert FileList to Array
      const fileArray = Array.from(files);

      // Validate file count
      if (selectedFiles.length + fileArray.length > maxFiles) {
        const error = `Maximum ${maxFiles} files allowed`;
        setUploadError(error);
        onUploadError?.(error);
        return;
      }

      // Validate file types
      const allowedExtensions = ['.pdf', '.docx', '.txt'];
      const invalidFiles = fileArray.filter(
        file => !allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
      );

      if (invalidFiles.length > 0) {
        const error = `Invalid file types: ${invalidFiles.map(f => f.name).join(', ')}. Only PDF, DOCX, and TXT files are supported.`;
        setUploadError(error);
        onUploadError?.(error);
        return;
      }

      // Validate file sizes (max 10MB each)
      const maxSize = 10 * 1024 * 1024; // 10MB
      const oversizedFiles = fileArray.filter(file => file.size > maxSize);

      if (oversizedFiles.length > 0) {
        const error = `Files too large: ${oversizedFiles.map(f => f.name).join(', ')}. Maximum size is 10MB per file.`;
        setUploadError(error);
        onUploadError?.(error);
        return;
      }

      // Add files to selection
      setSelectedFiles(prev => [...prev, ...fileArray]);
      setUploadError(null);
    },
    [selectedFiles, maxFiles, onUploadError]
  );

  /**
   * Handle drag events
   */
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      handleFilesSelected(e.dataTransfer.files);
    },
    [handleFilesSelected]
  );

  /**
   * Remove file from selection
   */
  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * Upload selected files to backend
   */
  const uploadFiles = useCallback(async () => {
    if (selectedFiles.length === 0) {
      setUploadError('No files selected');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Upload documents
      const response = await documentAnalysisApi.uploadDocuments(selectedFiles);

      // Check for partial failures
      const failedDocs = response.documents.filter(doc => doc.error);
      if (failedDocs.length > 0) {
        const error = `Failed to process: ${failedDocs.map(d => d.filename).join(', ')}`;
        setUploadError(error);
        onUploadError?.(error);
      }

      // Get successfully processed documents
      const successfulDocs = response.documents.filter(doc => !doc.error);

      if (successfulDocs.length > 0) {
        onUploadComplete(successfulDocs);
        setSelectedFiles([]); // Clear selection on success
      } else {
        setUploadError('No documents were successfully processed');
        onUploadError?.('No documents were successfully processed');
      }
    } catch (error) {
      const errorMessage =
        error instanceof DocumentAnalysisError
          ? error.message
          : 'Upload failed. Please try again.';

      setUploadError(errorMessage);
      onUploadError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  }, [selectedFiles, onUploadComplete, onUploadError]);

  /**
   * Format file size for display
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Drag-and-Drop Zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all ${
          isDragging
            ? 'border-neon-mint bg-neon-mint/5'
            : 'border-slate-700 hover:border-slate-600'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt"
          onChange={e => handleFilesSelected(e.target.files)}
          className="hidden"
          disabled={isUploading}
        />

        <div className="space-y-4">
          {/* Icon */}
          <div className="flex justify-center">
            <Upload className={`w-12 h-12 ${isDragging ? 'text-neon-mint' : 'text-gray-500'}`} />
          </div>

          {/* Instructions */}
          <div>
            <p className="text-white font-medium mb-1">
              Drag and drop files here
            </p>
            <p className="text-gray-400 text-sm">
              or{' '}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-neon-mint hover:underline"
                disabled={isUploading}
              >
                browse files
              </button>
            </p>
          </div>

          {/* File type info */}
          <p className="text-gray-500 text-xs">
            Supports PDF, DOCX, and TXT files (max 10MB each, {maxFiles} files max)
          </p>
        </div>
      </div>

      {/* Selected Files List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-white">
              Selected Files ({selectedFiles.length})
            </h3>
            {!isUploading && (
              <button
                onClick={() => setSelectedFiles([])}
                className="text-xs text-gray-400 hover:text-white"
              >
                Clear All
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <FileText className="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>

                {!isUploading && (
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 hover:bg-slate-700 rounded transition-colors"
                    title="Remove file"
                  >
                    <X className="w-4 h-4 text-gray-400 hover:text-white" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      {selectedFiles.length > 0 && (
        <button
          onClick={uploadFiles}
          disabled={isUploading}
          className="w-full px-4 py-3 bg-neon-mint text-slate-900 rounded-lg hover:bg-neon-mint/80 font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing documents...
            </>
          ) : (
            <>
              <Upload className="w-5 h-5" />
              Upload {selectedFiles.length} {selectedFiles.length === 1 ? 'File' : 'Files'}
            </>
          )}
        </button>
      )}

      {/* Error Message */}
      {uploadError && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{uploadError}</p>
        </div>
      )}
    </div>
  );
}
