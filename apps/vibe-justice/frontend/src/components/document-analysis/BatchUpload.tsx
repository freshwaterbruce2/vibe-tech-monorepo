/**
 * Batch Document Upload Component
 *
 * Features:
 * - Drag-and-drop multiple file upload
 * - Support for phone photos (JPG, PNG) + scanned PDFs
 * - Per-file progress tracking
 * - OCR quality indicators
 * - AI analysis results display
 * - Retry failed files
 */

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { BatchFileResult, BatchUploadResponse, CaseType } from '@/types/documentAnalysis'
import { CASE_TYPE_LABELS } from '@/types/documentAnalysis'
import { AlertCircle, CheckCircle, FileText, Image, Loader2, RefreshCw, Upload } from 'lucide-react'
import { useCallback, useState, type ChangeEvent, type DragEvent } from 'react'

interface BatchUploadProps {
  onUploadComplete?: (results: BatchUploadResponse) => void
}

export function BatchUpload({ onUploadComplete }: BatchUploadProps) {
  const [files, setFiles] = useState<File[]>([])
  const [caseType, setCaseType] = useState<CaseType>('employment_law')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [results, setResults] = useState<BatchUploadResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  // Handle file selection
  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || [])
    setFiles((prev) => [...prev, ...selectedFiles])
    setError(null)
  }, [])

  // Handle drag and drop
  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const droppedFiles = Array.from(e.dataTransfer.files)
    setFiles((prev) => [...prev, ...droppedFiles])
    setError(null)
  }, [])

  // Remove file from list
  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  // Upload batch
  const handleUpload = useCallback(async () => {
    if (files.length === 0) {
      setError('Please select at least one file')
      return
    }

    if (files.length > 50) {
      setError('Maximum 50 files allowed per batch')
      return
    }

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      // Create FormData
      const formData = new FormData()
      files.forEach((file) => {
        formData.append('files', file)
      })
      formData.append('case_type', caseType)
      formData.append('run_analysis', 'true')

      // Upload with progress simulation (FastAPI doesn't support true progress)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 500)

      const response = await fetch('http://localhost:8000/api/batch/upload', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Upload failed')
      }

      const data: BatchUploadResponse = await response.json()
      setUploadProgress(100)
      setResults(data)
      onUploadComplete?.(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      console.error('Batch upload error:', err)
    } finally {
      setIsUploading(false)
    }
  }, [files, caseType, onUploadComplete])

  // Retry failed files
  const retryFailedFiles = useCallback(() => {
    if (!results) return

    const failedFiles = results.file_results.filter((r) => !r.success).map((r) => r.filename)

    const retryFiles = files.filter((f) => failedFiles.includes(f.name))
    setFiles(retryFiles)
    setResults(null)
  }, [files, results])

  // Get file icon
  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'tiff', 'tif', 'webp'].includes(ext || '')) {
      return <Image className="h-5 w-5 text-blue-400" />
    }
    return <FileText className="h-5 w-5 text-gray-400" />
  }

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      {!results && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Batch Document Upload</h2>
          <p className="text-sm text-gray-400 mb-4">
            Upload multiple documents including phone photos, scanned PDFs, Word documents, and text
            files. Maximum 50 files, 25 MB each.
          </p>

          {/* Case Type Selector */}
          <div className="mb-4">
            <label className="text-sm font-medium mb-2 block">Case Type</label>
            <Select value={caseType} onValueChange={(value) => setCaseType(value as CaseType)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CASE_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Drag and Drop Zone */}
          <div
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-gray-600 hover:border-gray-500'
            }`}
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">
              {isDragging ? 'Drop files here' : 'Drag and drop files here'}
            </p>
            <p className="text-sm text-gray-400 mb-4">or click to browse</p>
            <input
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.tiff,.tif,.webp,.pdf,.docx,.txt"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label htmlFor="file-upload">
              <Button variant="outline" className="cursor-pointer" asChild>
                <span>Select Files</span>
              </Button>
            </label>
          </div>

          {/* Selected Files List */}
          {files.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-medium mb-2">Selected Files ({files.length})</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {files.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between p-2 bg-gray-800 rounded"
                  >
                    <div className="flex items-center gap-2">
                      {getFileIcon(file.name)}
                      <span className="text-sm">{file.name}</span>
                      <span className="text-xs text-gray-400">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={isUploading}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <span className="text-sm text-red-400">{error}</span>
            </div>
          )}

          {/* Upload Button */}
          {files.length > 0 && (
            <div className="mt-4">
              <Button onClick={handleUpload} disabled={isUploading} className="w-full">
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading & Analyzing...
                  </>
                ) : (
                  <>
                    Upload {files.length} File{files.length > 1 ? 's' : ''}
                  </>
                )}
              </Button>

              {isUploading && (
                <div className="mt-4">
                  <Progress value={uploadProgress} className="h-2" />
                  <p className="text-sm text-gray-400 mt-2 text-center">
                    {uploadProgress}% - Processing documents...
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Results Display */}
      {results && (
        <div className="space-y-6">
          {/* Summary Card */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Batch Processing Complete</h2>
              <Badge variant="outline" className="text-green-400 border-green-400">
                {results.successful_files}/{results.total_files} Successful
              </Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-400">Processing Time</p>
                <p className="text-2xl font-bold">{results.total_processing_time.toFixed(1)}s</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Violations Found</p>
                <p className="text-2xl font-bold">{results.summary.total_violations}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Critical Dates</p>
                <p className="text-2xl font-bold">{results.summary.total_dates}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Contradictions</p>
                <p className="text-2xl font-bold">{results.summary.total_contradictions}</p>
              </div>
            </div>

            {results.failed_files > 0 && (
              <Button variant="outline" onClick={retryFailedFiles} className="w-full">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry {results.failed_files} Failed File{results.failed_files > 1 ? 's' : ''}
              </Button>
            )}
          </Card>

          {/* File Results */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">File Processing Results</h3>
            <div className="space-y-2">
              {results.file_results.map((fileResult, index) => (
                <FileResultCard key={`${fileResult.filename}-${index}`} result={fileResult} />
              ))}
            </div>
          </Card>

          {/* Reset Button */}
          <Button
            onClick={() => {
              setFiles([])
              setResults(null)
              setError(null)
            }}
            variant="outline"
            className="w-full"
          >
            Upload More Documents
          </Button>
        </div>
      )}
    </div>
  )
}

// File Result Card Component
function FileResultCard({ result }: { result: BatchFileResult }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
      <div className="flex items-center gap-3 flex-1">
        {result.success ? (
          <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
        ) : (
          <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{result.filename}</p>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {result.success ? (
              <>
                <span>{result.word_count} words</span>
                <span>•</span>
                <span>
                  {result.page_count} page{result.page_count > 1 ? 's' : ''}
                </span>
                {result.ocr_quality && (
                  <>
                    <span>•</span>
                    <span>
                      OCR:{' '}
                      <span
                        className={
                          result.ocr_quality === 'high'
                            ? 'text-green-400'
                            : result.ocr_quality === 'medium'
                              ? 'text-yellow-400'
                              : 'text-red-400'
                        }
                      >
                        {result.ocr_quality}
                      </span>
                      {result.ocr_confidence && ` (${result.ocr_confidence.toFixed(0)}%)`}
                    </span>
                  </>
                )}
              </>
            ) : (
              <span className="text-red-400">{result.error}</span>
            )}
          </div>
        </div>

        <div className="text-xs text-gray-400 flex-shrink-0">
          {result.processing_time.toFixed(1)}s
        </div>
      </div>
    </div>
  )
}
