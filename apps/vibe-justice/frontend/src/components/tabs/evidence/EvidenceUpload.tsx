import { useState, useRef, type ChangeEvent, type DragEvent } from 'react';
import { justiceApi } from '../../../services/api';

export function EvidenceUpload({ caseId = "default-case", onUploadComplete }: { caseId?: string, onUploadComplete?: (fileName: string) => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadStatus(null);
    try {
      // Upload starting - file: ${file.name}
      await justiceApi.uploadEvidence(file, caseId);
      
      setUploadStatus(`✅ Successfully uploaded: ${file.name}`);
      if (onUploadComplete) onUploadComplete(file.name);
    } catch (error) {
      setUploadStatus(`❌ Error: ${error instanceof Error ? error.message : 'Upload failed'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div 
      className={`p-6 border-2 border-dashed rounded-lg transition-colors ${
        isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="text-4xl">📸</div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Drag & Drop Evidence</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Supports PDF, DOCX, TXT, and Phone Photos (JPG, PNG) for OCR extraction.
          </p>
        </div>
        
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }} 
          accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.webp,.tiff" 
        />
        <button
          onClick={handleButtonClick}
          disabled={isUploading}
          className={`mt-2 px-6 py-2 font-semibold text-white rounded shadow-md transition-colors ${
            isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isUploading ? 'Uploading & Processing...' : 'Browse Files'}
        </button>
        {uploadStatus && (
          <p className={`text-sm font-medium ${uploadStatus.startsWith('✅') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {uploadStatus}
          </p>
        )}
      </div>
    </div>
  );
}
