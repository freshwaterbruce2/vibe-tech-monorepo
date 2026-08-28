import { useState, useRef, type ChangeEvent } from 'react';
import { justiceApi } from '../../../services/api';

export function EvidenceUpload({ caseId = "default-case", onUploadComplete }: { caseId?: string, onUploadComplete?: (fileName: string) => void }) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
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
    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }} 
          accept=".pdf,.docx,.txt,.jpg,.png" 
        />
        <button
          onClick={handleButtonClick}
          disabled={isUploading}
          className={`px-4 py-2 font-semibold text-white rounded shadow-md transition-colors ${
            isUploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isUploading ? 'Uploading...' : 'Upload Evidence'}
        </button>
        {uploadStatus && (
          <p className={`text-sm ${uploadStatus.startsWith('✅') ? 'text-green-600' : 'text-red-600'}`}>
            {uploadStatus}
          </p>
        )}
      </div>
    </div>
  );
}
