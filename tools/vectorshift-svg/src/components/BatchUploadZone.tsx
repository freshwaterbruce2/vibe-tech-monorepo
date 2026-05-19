import React, { useCallback, useRef, useState } from 'react';
import { FilePlus2, FolderOpen, UploadCloud } from 'lucide-react';
import toast from '../lib/toast';
import type { HistoryItem } from './VectorShiftDashboard';

type BatchStatus = 'success' | 'failed' | 'skipped';

interface BatchResult {
  filename: string;
  status: BatchStatus;
  error?: string;
  output_path?: string;
  output_name?: string;
  download_url?: string;
}

interface BatchEvent extends Partial<BatchResult> {
  type: 'start' | 'progress' | 'complete';
  current?: number;
  total?: number;
  output_dir?: string;
}

interface BatchUploadZoneProps {
  onAddHistory: (items: HistoryItem[]) => void;
}

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export default function BatchUploadZone({ onAddHistory }: BatchUploadZoneProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [outputDir, setOutputDir] = useState('D:/VectorShift_Outputs');
  const [isComplete, setIsComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incomingFiles: File[]) => {
    const imageFiles = incomingFiles.filter((file) => IMAGE_TYPES.has(file.type));

    if (incomingFiles.length > 0 && imageFiles.length === 0) {
      toast.error('No PNG, JPG, or WEBP images found.');
      return;
    }

    setFiles((previous) => {
      const seen = new Set(previous.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
      const next = [...previous];

      for (const file of imageFiles) {
        const key = `${file.name}:${file.size}:${file.lastModified}`;
        if (!seen.has(key)) {
          next.push(file);
          seen.add(key);
        }
      }

      return next;
    });
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      addFiles(Array.from(event.dataTransfer.files));
    },
    [addFiles],
  );

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = '';
  };

  const resetBatch = () => {
    setFiles([]);
    setResults([]);
    setIsComplete(false);
    setProgress({ current: 0, total: 0 });
  };

  const buildHistoryItems = (batchResults: BatchResult[]): HistoryItem[] =>
    batchResults.map((result) => ({
      id: crypto.randomUUID?.() ?? `${result.filename}-${Date.now()}-${Math.random()}`,
      name: result.filename,
      status: result.status,
      error: result.error,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      outputPath: result.output_path,
      outputName: result.output_name,
      downloadUrl: result.download_url,
    }));

  const handleBatchProcess = async () => {
    if (files.length === 0) {
      toast.error('Add images before starting a batch.');
      return;
    }

    setIsProcessing(true);
    setIsComplete(false);
    setProgress({ current: 0, total: files.length });
    setResults([]);

    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));

    const localResults: BatchResult[] = [];

    try {
      const response = await fetch('/api/batch-process', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok || !response.body) {
        const message = await response.text().catch(() => '');
        throw new Error(message || `Vector engine returned HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const handleLine = (line: string) => {
        if (!line.trim()) return;

        const data = JSON.parse(line) as BatchEvent;
        if (data.type === 'start') {
          setProgress({ current: 0, total: data.total ?? files.length });
          if (data.output_dir) setOutputDir(data.output_dir);
          return;
        }

        if (data.type === 'progress' && data.filename && data.status) {
          setProgress({ current: data.current ?? 0, total: data.total ?? files.length });

          const result: BatchResult = {
            filename: data.filename,
            status: data.status,
            error: data.error,
            output_path: data.output_path,
            output_name: data.output_name,
            download_url: data.download_url,
          };

          localResults.push(result);
          setResults((previous) => [...previous, result]);

          if (result.status === 'failed') {
            toast.error(`Failed: ${result.filename}`, { id: result.filename });
          }
        }

        if (data.type === 'complete') {
          setIsComplete(true);
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          handleLine(line);
        }
      }

      if (buffer.trim()) {
        handleLine(buffer);
      }

      const successful = localResults.filter((result) => result.status === 'success').length;
      const failed = localResults.filter((result) => result.status === 'failed').length;
      const skipped = localResults.filter((result) => result.status === 'skipped').length;

      if (failed > 0 || skipped > 0) {
        toast.error(`Batch complete: ${successful} converted, ${failed} failed, ${skipped} skipped.`);
      } else {
        toast.success(`Batch complete: ${successful} SVG file(s) created.`);
      }

      onAddHistory(buildHistoryItems(localResults));
      setIsComplete(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(`Batch failed: ${message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const percentComplete = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
  const successfulCount = results.filter((result) => result.status === 'success').length;

  if (isComplete) {
    return (
      <div className="border-2 border-dashed border-[#333] bg-[#0A0A0A] p-12 text-center flex flex-col justify-center h-full">
        <h3 className="text-[#CCFF00] font-mono font-black italic text-xl uppercase tracking-widest mb-4">
          Batch Process Complete
        </h3>
        <p className="text-gray-500 mb-6">
          {successfulCount} SVG file(s) written to {outputDir}
        </p>
        <div className="space-y-2 mb-6 text-xs font-mono text-left bg-neutral-900 border border-[#333] p-4 max-h-64 overflow-y-auto">
          {results.map((result, index) => (
            <div
              key={`${result.filename}-${index}`}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-4 text-[#F0F0F0] border-b border-[#222] pb-2 last:border-0 last:pb-0"
            >
              <span className="truncate" title={result.error ?? result.output_path}>
                {result.filename}
              </span>
              <span
                className={
                  result.status === 'success'
                    ? 'text-[#CCFF00] uppercase font-bold tracking-widest'
                    : 'text-red-500 uppercase font-bold tracking-widest'
                }
              >
                {result.status}
              </span>
              {result.download_url ? (
                <a
                  href={result.download_url}
                  download
                  className="border border-[#333] px-2 py-1 text-[10px] uppercase hover:border-[#CCFF00] hover:text-[#CCFF00]"
                >
                  SVG
                </a>
              ) : (
                <span className="text-neutral-700 text-[10px] uppercase">No file</span>
              )}
            </div>
          ))}
        </div>
        <button
          onClick={resetBatch}
          className="mt-2 bg-[#0A0A0A] border border-[#333] text-neutral-400 font-bold py-2 px-6 hover:text-[#CCFF00] hover:border-[#CCFF00] transition-colors uppercase text-xs tracking-widest"
        >
          Start New Batch
        </button>
      </div>
    );
  }

  if (isProcessing) {
    return (
      <div className="border-2 border-solid border-[#CCFF00] bg-[#0A0A0A] p-12 text-center flex flex-col justify-center items-center h-full">
        <div className="w-16 h-16 border-4 border-[#333] border-t-[#CCFF00] rounded-full animate-spin mb-8" />
        <h3 className="text-[#CCFF00] font-mono font-black italic text-xl uppercase tracking-widest mb-4">
          Crunching Vectors...
        </h3>
        <p className="text-neutral-400 font-mono text-sm uppercase tracking-widest mb-8">
          Processing {progress.current} of {progress.total}
        </p>

        <div className="w-full max-w-sm h-3 border border-[#333] bg-[#111] overflow-hidden relative shadow-[0_0_15px_rgba(204,255,0,0.2)]">
          <div
            className="h-full bg-[#CCFF00] transition-all duration-300 ease-out"
            style={{ width: `${percentComplete}%` }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.4),transparent)] -translate-x-full animate-[shimmer_1.5s_infinite]" />
        </div>
        <div className="mt-4 font-mono text-xs text-[#CCFF00] tracking-widest">
          {percentComplete}% COMPUTED
        </div>
      </div>
    );
  }

  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
      className="border-2 border-dashed border-[#CCFF00] bg-[#0A0A0A] p-12 text-center flex flex-col justify-center h-full transition-colors"
    >
      <UploadCloud className="mx-auto text-[#CCFF00] mb-4" size={48} />
      <h3 className="text-[#F0F0F0] font-mono font-black italic text-xl uppercase tracking-widest">
        Drop Images or a Folder Here
      </h3>
      <p className="text-gray-500 mt-2 font-mono text-sm">
        Queued files: <span className="text-[#F0F0F0] font-bold">{files.length}</span>
      </p>

      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center gap-2 border border-[#333] text-neutral-300 font-bold py-3 px-5 hover:text-[#CCFF00] hover:border-[#CCFF00] transition-colors uppercase tracking-widest text-xs"
        >
          <FilePlus2 className="w-4 h-4" />
          Add Images
        </button>
        <button
          onClick={() => folderInputRef.current?.click()}
          className="inline-flex items-center gap-2 border border-[#333] text-neutral-300 font-bold py-3 px-5 hover:text-[#CCFF00] hover:border-[#CCFF00] transition-colors uppercase tracking-widest text-xs"
        >
          <FolderOpen className="w-4 h-4" />
          Add Folder
        </button>
        {files.length > 0 && (
          <button
            onClick={handleBatchProcess}
            className="bg-[#CCFF00] text-[#0A0A0A] font-black py-3 px-5 hover:bg-[#AACC00] transition-colors uppercase tracking-widest text-xs"
          >
            Start Batch Process
          </button>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleInputChange}
        accept="image/png, image/jpeg, image/jpg, image/webp"
        multiple
        className="hidden"
      />
      <input
        type="file"
        ref={folderInputRef}
        onChange={handleInputChange}
        accept="image/png, image/jpeg, image/jpg, image/webp"
        multiple
        className="hidden"
        {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
      />
    </div>
  );
}
