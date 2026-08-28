import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon } from 'lucide-react';

interface UploadZoneProps {
  onUpload: (file: File) => void;
  isUploading: boolean;
}

export function UploadZone({ onUpload, isUploading }: UploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        onUpload(file);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUpload(e.target.files[0]);
    }
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-center w-full h-96 border-2 border-dashed transition-all duration-300 ${
        isDragOver ? 'border-[#CCFF00] bg-[#CCFF000a] scale-[1.01]' : 'border-[#333] hover:border-[#CCFF00]/50 bg-neutral-900/50'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => fileInputRef.current?.click()}
    >
      <div className="absolute inset-0 bg-[radial-gradient(#222_1px,transparent_1px)] [background-size:20px_20px] opacity-30 pointer-events-none" />

      <div className="z-10 flex flex-col items-center text-center p-6">
        <div className={`w-20 h-20 mb-6 flex items-center justify-center border transition-colors ${isDragOver ? 'border-[#CCFF00] text-[#CCFF00] bg-[#CCFF0010]' : 'border-[#333] text-neutral-400 bg-[#0A0A0A]'}`}>
          {isUploading ? (
            <div className="w-8 h-8 border-2 border-[#CCFF00] border-t-transparent rounded-full animate-spin" />
          ) : (
            <UploadCloud className="w-8 h-8" />
          )}
        </div>

        <h3 className="text-xl font-black uppercase italic mb-2 tracking-wide">
          {isUploading ? 'Uploading...' : 'Upload Image to Vectorize'}
        </h3>

        <p className="text-sm font-mono text-neutral-500 mb-6 max-w-sm">
          {isUploading
            ? 'Neural tracing engine initializing...'
            : 'Drag & drop your PNG or JPEG here, or click to browse.'}
        </p>

        {!isUploading && (
          <div className="flex items-center gap-3 bg-[#0A0A0A] border border-[#333] px-4 py-2 text-xs font-bold uppercase tracking-widest text-[#F0F0F0] mt-4">
            <ImageIcon className="w-4 h-4 text-[#CCFF00]" />
            <span>Max 30MB / Auto-Removes Background</span>
          </div>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleChange}
        accept="image/png, image/jpeg, image/jpg, image/webp"
        className="hidden"
      />
    </div>
  );
}
