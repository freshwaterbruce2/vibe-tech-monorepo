import {
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileSearch,
  FileText,
  FolderOpen,
  Image,
  Layers,
  Loader2,
  Printer,
  Shield,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react'
import { useRef, useState, type ChangeEvent } from 'react'
import { documentAnalysisApi } from '../services/documentAnalysis'
import { httpClient } from '../services/httpClient'
import { isTauri, tauriAPI } from '../services/tauri'
import type { CaseType, CompleteAnalysisResponse } from '../types/documentAnalysis'
import {
  CASE_TYPE_DESCRIPTIONS as caseTypeDescriptions,
  CASE_TYPE_LABELS as caseTypeLabels,
} from '../types/documentAnalysis'
import { BatchUpload } from './document-analysis/BatchUpload'

interface Document {
  id: string
  name: string
  type: 'pdf' | 'docx' | 'txt' | 'image'
  size: number
  uploadedAt: Date
  content?: string
  extractedText?: string
  status: 'uploading' | 'processing' | 'ready' | 'error'
}

// Using CompleteAnalysisResponse type instead of custom interface
type AnalysisResult = CompleteAnalysisResponse

export function DocumentManager() {
  const [viewMode, setViewMode] = useState<'single' | 'batch'>('single')
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [caseType, setCaseType] = useState<CaseType>('employment_law')
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const api = httpClient

  // Handle file upload from native file dialog (Tauri) or web input
  const handleUpload = async () => {
    if (isTauri()) {
      try {
        const files = await tauriAPI.openFileDialog({
          title: 'Select Documents to Upload',
          multiple: true,
          filters: [
            { name: 'Documents', extensions: ['pdf', 'docx', 'txt'] },
            { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif'] },
            { name: 'All Files', extensions: ['*'] },
          ],
        })

        for (const filePath of files) {
          await processFile(filePath)
        }
      } catch (error) {
        console.error('Failed to open file dialog:', error)
      }
    } else {
      // Fallback to web file input
      fileInputRef.current?.click()
    }
  }

  const handleWebFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    setUploadError(null) // Clear previous errors
    const allowedExtensions = ['.pdf', '.docx', '.txt', '.jpg', '.jpeg', '.png']

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file) continue
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase()

      if (!allowedExtensions.includes(fileExt)) {
        setUploadError(
          `Error: Unsupported file type: ${file.name}. Please upload PDF, DOCX, TXT, JPG, JPEG, or PNG files.`
        )
        continue
      }

      await processWebFile(file)
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const processFile = async (filePath: string) => {
    const fileName = filePath.split(/[/\\]/).pop() || 'Unknown'
    const fileType = getFileType(fileName)

    const newDoc: Document = {
      id: crypto.randomUUID(),
      name: fileName,
      type: fileType,
      size: 0,
      uploadedAt: new Date(),
      status: 'uploading',
    }

    setDocuments((prev) => [...prev, newDoc])

    // Auto-select the document immediately (button appears but is disabled until upload completes)
    setSelectedDoc(newDoc)

    try {
      // Read file content using Tauri
      const content = await tauriAPI.readFile(filePath)

      setDocuments((prev) =>
        prev.map((d) =>
          d.id === newDoc.id ? { ...d, content, size: content.length, status: 'processing' } : d
        )
      )

      // For Tauri, we need to convert content to a Blob/File for FormData
      const blob = new Blob([content], { type: 'text/plain' })
      const file = new File([blob], fileName, { type: 'text/plain' })

      const formData = new FormData()
      formData.append('files', file)

      const response = await api.post('/api/document-analysis/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const uploadedDoc = response.data.documents?.[0]

      // Create the final updated document object
      const finalDoc: Document = {
        ...newDoc,
        extractedText: uploadedDoc?.text_content || '',
        status: 'ready',
      }

      // Update documents array
      setDocuments((prev) => prev.map((d) => (d.id === newDoc.id ? finalDoc : d)))

      // Update selectedDoc if it's still the same document (user hasn't selected a different one)
      setSelectedDoc((prev) => (prev?.id === newDoc.id ? finalDoc : prev))
    } catch (error) {
      console.error('Failed to process file:', error)
      const errorMessage =
        error instanceof Error ? `Error reading file: ${error.message}` : 'Error reading file'
      setUploadError(errorMessage)
      setDocuments((prev) => prev.map((d) => (d.id === newDoc.id ? { ...d, status: 'error' } : d)))
    }
  }

  const processWebFile = async (file: File) => {
    const fileType = getFileType(file.name)

    const newDoc: Document = {
      id: crypto.randomUUID(),
      name: file.name,
      type: fileType,
      size: file.size,
      uploadedAt: new Date(),
      status: 'uploading',
    }

    setDocuments((prev) => [...prev, newDoc])

    // Auto-select the document immediately (button appears but is disabled until upload completes)
    setSelectedDoc(newDoc)

    try {
      // For text files, read content locally
      let localContent = ''
      if (fileType === 'txt') {
        localContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = (e) => resolve((e.target?.result as string) || '')
          reader.onerror = reject
          reader.readAsText(file)
        })
      }

      const formData = new FormData()
      formData.append('files', file)

      const response = await api.post('/api/document-analysis/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      // Backend returns { success: true, documents: [...], message: "..." }
      const uploadedDoc = response.data.documents?.[0]

      // Use local content for txt files, otherwise use backend-extracted text
      const extractedText = localContent || uploadedDoc?.text_content || ''

      // Create the final updated document object
      const finalDoc: Document = {
        ...newDoc,
        extractedText,
        status: 'ready',
      }

      // Update documents array
      setDocuments((prev) => prev.map((d) => (d.id === newDoc.id ? finalDoc : d)))

      // Update selectedDoc if it's still the same document (user hasn't selected a different one)
      setSelectedDoc((prev) => (prev?.id === newDoc.id ? finalDoc : prev))
    } catch (error) {
      console.error('Failed to upload file:', error)
      const errorMessage =
        error instanceof Error ? `Error uploading file: ${error.message}` : 'Error uploading file'
      setUploadError(errorMessage)
      setDocuments((prev) => prev.map((d) => (d.id === newDoc.id ? { ...d, status: 'error' } : d)))
    }
  }

  const getFileType = (filename: string): Document['type'] => {
    const ext = filename.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return 'image'
    if (ext === 'pdf') return 'pdf'
    if (ext === 'docx') return 'docx'
    return 'txt'
  }

  const analyzeDocument = async (doc: Document) => {
    setSelectedDoc(doc)
    setIsAnalyzing(true)
    setAnalysisResult(null)
    setAnalysisError(null) // Clear previous errors

    try {
      // Use proper documentAnalysisApi service with correct request format
      const result = await documentAnalysisApi.completeAnalysis({
        documents: [
          {
            filename: doc.name,
            text_content: doc.extractedText || doc.content || '',
          },
        ],
        case_type: caseType, // Use selected case type (employment_law, family_law, or estate_law)
      })

      // Backend returns CompleteAnalysisResponse: { violations, dates, contradictions, summary }
      setAnalysisResult(result)
    } catch (error) {
      console.error('Analysis failed:', error)

      // Extract meaningful error message
      let errorMessage = 'Analysis failed'
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { detail?: string; message?: string } } }
        errorMessage =
          axiosError.response?.data?.detail ||
          axiosError.response?.data?.message ||
          'Analysis failed'
      } else if (error instanceof Error) {
        errorMessage = error.message
      }

      setAnalysisError(errorMessage)
      setAnalysisResult(null)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const exportResults = async (format: 'pdf' | 'docx' | 'txt') => {
    if (!analysisResult || !selectedDoc) return
    setIsExporting(true)
    setExportError(null) // Clear previous errors

    try {
      const exportContent = generateExportContent(selectedDoc, analysisResult)

      if (isTauri()) {
        const savePath = await tauriAPI.saveFileDialog({
          title: 'Save Analysis Report',
          defaultPath: `${selectedDoc.name}-analysis.${format}`,
          filters: [{ name: format.toUpperCase(), extensions: [format] }],
        })

        if (savePath) {
          await tauriAPI.writeFile(savePath, exportContent)
          alert(`Report saved to: ${savePath}`)
        }
      } else {
        // Web fallback - download file
        const blob = new Blob([exportContent], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${selectedDoc.name}-analysis.${format}`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error(`Export to ${format.toUpperCase()} failed:`, error)

      // Extract meaningful error message
      let errorMessage = `Export to ${format.toUpperCase()} failed`
      if (error instanceof Error) {
        errorMessage = error.message
      }

      setExportError(errorMessage)
    } finally {
      setIsExporting(false)
    }
  }

  const generateExportContent = (doc: Document, analysis: AnalysisResult): string => {
    const caseStrengthEmoji =
      analysis.summary.case_strength === 'STRONG'
        ? '💪 STRONG'
        : analysis.summary.case_strength === 'MODERATE'
          ? '⚖️  MODERATE'
          : '⚠️  WEAK'

    return `
VIBE JUSTICE - LEGAL ANALYSIS REPORT
=====================================
Generated: ${new Date().toLocaleString()}

Document: ${doc.name}
Type: ${doc.type.toUpperCase()}
Uploaded: ${doc.uploadedAt.toLocaleString()}

CASE STRENGTH ASSESSMENT
-------------------------
Overall Strength: ${caseStrengthEmoji}

Summary Statistics:
- Total Violations: ${analysis.summary.total_violations} (${analysis.summary.critical_violations} critical)
- Critical Dates: ${analysis.summary.total_dates} (${analysis.summary.urgent_dates} urgent)
- Contradictions Found: ${analysis.summary.total_contradictions}

LEGAL VIOLATIONS DETECTED
--------------------------
${
  analysis.violations.length === 0
    ? 'No violations detected.'
    : analysis.violations
        .map(
          (v, i) => `
${i + 1}. [${v.severity}] ${v.type}
   Statute: ${v.statute}
   Evidence: ${v.evidence}
   ${v.pageNumber ? `Page: ${v.pageNumber}` : ''}
   Recommended Action: ${v.recommendedAction}
`
        )
        .join('\n')
}

CRITICAL DATES & DEADLINES
---------------------------
${
  analysis.dates.length === 0
    ? 'No critical dates identified.'
    : analysis.dates
        .map(
          (d, i) => `
${i + 1}. ${d.label} - ${new Date(d.date).toLocaleDateString()}
   Importance: ${d.importance}
   Days Remaining: ${d.days_remaining} ${d.is_urgent ? '🚨 URGENT' : ''}
   Context: ${d.context}
   Source: ${d.source}
`
        )
        .join('\n')
}

CONTRADICTIONS IDENTIFIED
--------------------------
${
  analysis.contradictions.length === 0
    ? 'No contradictions found.'
    : analysis.contradictions
        .map(
          (c, i) => `
${i + 1}. [${c.severity}] Contradiction
   Statement 1 (${c.source1}):
   "${c.statement1}"

   Statement 2 (${c.source2}):
   "${c.statement2}"

   Impact: ${c.impact}
   Suggested Rebuttal: ${c.rebuttal}
`
        )
        .join('\n')
}

---
Report generated by Vibe Justice Legal Assistant
Powered by DeepSeek R1 AI Legal Analysis
    `.trim()
  }

  const printDocument = () => {
    if (!analysisResult || !selectedDoc) return

    const printContent = generateExportContent(selectedDoc, analysisResult)
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Vibe Justice - Analysis Report</title>
            <style>
              body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; line-height: 1.6; }
              h1 { color: #1e3a5f; border-bottom: 2px solid #00ff9f; padding-bottom: 10px; }
              h2 { color: #2d4a6f; margin-top: 30px; }
              pre { white-space: pre-wrap; font-family: inherit; }
            </style>
          </head>
          <body>
            <pre>${printContent}</pre>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const deleteDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id))
    if (selectedDoc?.id === id) {
      setSelectedDoc(null)
      setAnalysisResult(null)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white">
      {/* Header */}
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <FileSearch className="w-5 h-5 text-neon-mint" />
            Legal Document Analysis
          </h2>
          <p className="text-sm text-slate-400">Upload documents for analysis</p>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-800/50 rounded-lg p-1">
              <button
                onClick={() => setViewMode('single')}
                className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors ${
                  viewMode === 'single'
                    ? 'bg-neon-mint/20 text-neon-mint border border-neon-mint/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <FileText className="w-4 h-4" />
                Single Mode
              </button>
              <button
                onClick={() => setViewMode('batch')}
                className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors ${
                  viewMode === 'batch'
                    ? 'bg-neon-mint/20 text-neon-mint border border-neon-mint/30'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Layers className="w-4 h-4" />
                Batch Mode
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {viewMode === 'single' ? 'Single Document Mode' : 'Batch Processing Mode'}
            </p>

            {viewMode === 'single' && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleWebFileChange}
                  multiple
                  accept=".pdf,.docx,.txt,.jpg,.jpeg,.png"
                  className="hidden"
                />
                <button
                  onClick={handleUpload}
                  className="px-4 py-2 bg-neon-mint text-slate-900 rounded-lg hover:bg-neon-mint/80 font-medium flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Document
                </button>
                {isTauri() && (
                  <button
                    onClick={handleUpload}
                    aria-label="Open folder in file explorer"
                    className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 flex items-center gap-2"
                    title="Open folder in file explorer"
                  >
                    <FolderOpen className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Upload error */}
        {uploadError && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <span className="text-sm text-red-400">{uploadError}</span>
          </div>
        )}

        {/* Case Type Selector - Only show for single upload mode */}
        {viewMode === 'single' && (
          <div className="bg-slate-800/50 rounded-lg p-3">
            <label className="block text-xs font-medium text-gray-400 mb-2">Select Case Type</label>
            <select
              value={caseType}
              onChange={(e) => setCaseType(e.target.value as CaseType)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-mint/50 focus:ring-1 focus:ring-neon-mint/20"
            >
              {(Object.keys(caseTypeLabels) as CaseType[]).map((type) => (
                <option key={type} value={type}>
                  {caseTypeLabels[type]}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">{caseTypeDescriptions[caseType]}</p>
          </div>
        )}
      </div>

      {/* Batch Upload View */}
      {viewMode === 'batch' ? (
        <div className="flex-1 overflow-y-auto p-4">
          <BatchUpload
            onUploadComplete={(_results) => {
              // console.log('Batch upload complete:', results)
              // Optionally switch back to single view to show results
              // setViewMode('single')
            }}
          />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Document List */}
          <div className="w-80 border-r border-slate-800 overflow-y-auto">
            <div className="p-2">
              {documents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No documents uploaded</p>
                  <p className="text-sm">Click "Upload Documents" to get started</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className={`document-item ${selectedDoc?.id === doc.id ? 'selected' : ''} p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedDoc?.id === doc.id
                          ? 'bg-neon-mint/20 border border-neon-mint/30'
                          : 'bg-slate-800/50 hover:bg-slate-800 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {doc.type === 'image' ? (
                            <Image className="w-4 h-4 text-purple-400" />
                          ) : (
                            <FileText className="w-4 h-4 text-blue-400" />
                          )}
                          <span className="text-sm font-medium truncate max-w-[150px]">
                            {doc.name}
                          </span>
                        </div>
                        {doc.status === 'uploading' && (
                          <Loader2 className="w-4 h-4 animate-spin text-neon-mint" />
                        )}
                        {doc.status === 'processing' && (
                          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                        )}
                        {doc.status === 'ready' && (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        )}
                        {doc.status === 'error' && <XCircle className="w-4 h-4 text-red-400" />}
                      </div>
                      <div className="mt-1 text-xs text-gray-500 flex items-center justify-between">
                        <span>{formatFileSize(doc.size)}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteDocument(doc.id)
                          }}
                          aria-label="Delete"
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Document Preview & Analysis */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedDoc ? (
              <>
                {/* Document Actions */}
                <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="font-semibold">Document Details</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => analyzeDocument(selectedDoc)}
                      disabled={isAnalyzing || selectedDoc.status !== 'ready'}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-500 disabled:opacity-50 flex items-center gap-2 text-sm"
                    >
                      {isAnalyzing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                      Analyze
                    </button>
                    {analysisResult && (
                      <>
                        <button
                          onClick={() => exportResults('pdf')}
                          disabled={isExporting}
                          className="px-3 py-1.5 bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-50 flex items-center gap-2 text-sm"
                        >
                          <Download className="w-4 h-4" />
                          {isExporting ? 'Exporting...' : 'Export PDF'}
                        </button>
                        <button
                          onClick={() => exportResults('docx')}
                          disabled={isExporting}
                          className="px-3 py-1.5 bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-50 flex items-center gap-2 text-sm"
                        >
                          <Download className="w-4 h-4" />
                          {isExporting ? 'Exporting...' : 'Export DOCX'}
                        </button>
                        <button
                          onClick={() => exportResults('txt')}
                          disabled={isExporting}
                          className="px-3 py-1.5 bg-slate-700 text-white rounded hover:bg-slate-600 disabled:opacity-50 flex items-center gap-2 text-sm"
                        >
                          <Download className="w-4 h-4" />
                          {isExporting ? 'Exporting...' : 'Export TXT'}
                        </button>
                        <button
                          onClick={printDocument}
                          className="px-3 py-1.5 bg-slate-700 text-white rounded hover:bg-slate-600 flex items-center gap-2 text-sm"
                        >
                          <Printer className="w-4 h-4" />
                          Print
                        </button>
                      </>
                    )}
                  </div>

                  {/* Export error */}
                  {exportError && (
                    <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                      <span className="text-sm text-red-400">{exportError}</span>
                    </div>
                  )}
                </div>

                {/* Analysis error */}
                {analysisError && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                    <span className="text-sm text-red-400">{analysisError}</span>
                  </div>
                )}

                {/* Analysis Results */}
                <div className="flex-1 overflow-y-auto p-4">
                  {isAnalyzing ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-indigo-400" />
                      <p className="text-gray-400">Analyzing document...</p>
                      <p className="text-sm text-gray-500">
                        Extracting text, entities, and legal references
                      </p>
                    </div>
                  ) : analysisResult ? (
                    <div className="space-y-6">
                      {/* Case Strength Summary */}
                      <div
                        className={`rounded-lg p-4 border ${
                          analysisResult.summary.case_strength === 'STRONG'
                            ? 'bg-green-500/10 border-green-500/30'
                            : analysisResult.summary.case_strength === 'MODERATE'
                              ? 'bg-yellow-500/10 border-yellow-500/30'
                              : 'bg-red-500/10 border-red-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Shield
                              className={`w-5 h-5 ${
                                analysisResult.summary.case_strength === 'STRONG'
                                  ? 'text-green-400'
                                  : analysisResult.summary.case_strength === 'MODERATE'
                                    ? 'text-yellow-400'
                                    : 'text-red-400'
                              }`}
                            />
                            Case Strength Assessment
                          </h4>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-bold ${
                              analysisResult.summary.case_strength === 'STRONG'
                                ? 'bg-green-500/20 text-green-300'
                                : analysisResult.summary.case_strength === 'MODERATE'
                                  ? 'bg-yellow-500/20 text-yellow-300'
                                  : 'bg-red-500/20 text-red-300'
                            }`}
                          >
                            {analysisResult.summary.case_strength}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-400">Violations</p>
                            <p className="text-xl font-bold text-white">
                              {analysisResult.summary.total_violations}
                              {analysisResult.summary.critical_violations > 0 && (
                                <span className="text-red-400 text-sm ml-1">
                                  ({analysisResult.summary.critical_violations} critical)
                                </span>
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400">Critical Dates</p>
                            <p className="text-xl font-bold text-white">
                              {analysisResult.summary.total_dates}
                              {analysisResult.summary.urgent_dates > 0 && (
                                <span className="text-amber-400 text-sm ml-1">
                                  ({analysisResult.summary.urgent_dates} urgent)
                                </span>
                              )}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-400">Contradictions</p>
                            <p className="text-xl font-bold text-white">
                              {analysisResult.summary.total_contradictions}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Legal Violations */}
                      {analysisResult.violations.length > 0 && (
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                          <h4 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            Legal Violations Detected ({analysisResult.violations.length})
                          </h4>
                          <div className="space-y-3">
                            {analysisResult.violations.map((violation, i) => (
                              <div
                                key={i}
                                className={`p-3 rounded border ${
                                  violation.severity === 'CRITICAL'
                                    ? 'bg-red-500/10 border-red-500/30'
                                    : violation.severity === 'HIGH'
                                      ? 'bg-orange-500/10 border-orange-500/30'
                                      : violation.severity === 'MEDIUM'
                                        ? 'bg-yellow-500/10 border-yellow-500/30'
                                        : 'bg-blue-500/10 border-blue-500/30'
                                }`}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <h5 className="font-semibold text-white">{violation.type}</h5>
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-bold ${
                                      violation.severity === 'CRITICAL'
                                        ? 'bg-red-500/20 text-red-300'
                                        : violation.severity === 'HIGH'
                                          ? 'bg-orange-500/20 text-orange-300'
                                          : violation.severity === 'MEDIUM'
                                            ? 'bg-yellow-500/20 text-yellow-300'
                                            : 'bg-blue-500/20 text-blue-300'
                                    }`}
                                  >
                                    {violation.severity}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-400 mb-2">
                                  <span className="font-semibold">Statute:</span>{' '}
                                  {violation.statute}
                                </p>
                                <p className="text-sm text-gray-300 mb-2">
                                  <span className="font-semibold">Evidence:</span>{' '}
                                  {violation.evidence}
                                </p>
                                {violation.pageNumber && (
                                  <p className="text-xs text-gray-500 mb-2">
                                    Page {violation.pageNumber}
                                  </p>
                                )}
                                <p className="text-sm text-neon-mint">
                                  <span className="font-semibold">→ Action:</span>{' '}
                                  {violation.recommendedAction}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Critical Dates */}
                      {analysisResult.dates.length > 0 && (
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                          <h4 className="font-semibold text-amber-400 mb-3 flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            Critical Dates & Deadlines ({analysisResult.dates.length})
                          </h4>
                          <div className="space-y-3">
                            {analysisResult.dates.map((date, i) => (
                              <div
                                key={i}
                                className={`p-3 rounded border ${
                                  date.is_urgent
                                    ? 'bg-red-500/10 border-red-500/30'
                                    : date.importance === 'CRITICAL'
                                      ? 'bg-red-500/10 border-red-500/30'
                                      : date.importance === 'HIGH'
                                        ? 'bg-amber-500/10 border-amber-500/30'
                                        : 'bg-blue-500/10 border-blue-500/30'
                                }`}
                              >
                                <div className="flex items-start justify-between mb-2">
                                  <h5 className="font-semibold text-white">{date.label}</h5>
                                  <div className="flex items-center gap-2">
                                    {date.is_urgent && (
                                      <span className="px-2 py-0.5 bg-red-500/20 text-red-300 rounded text-xs font-bold">
                                        🚨 URGENT
                                      </span>
                                    )}
                                    <span
                                      className={`px-2 py-0.5 rounded text-xs font-bold ${
                                        date.importance === 'CRITICAL'
                                          ? 'bg-red-500/20 text-red-300'
                                          : date.importance === 'HIGH'
                                            ? 'bg-amber-500/20 text-amber-300'
                                            : 'bg-blue-500/20 text-blue-300'
                                      }`}
                                    >
                                      {date.importance}
                                    </span>
                                  </div>
                                </div>
                                <p className="text-lg font-semibold text-neon-mint mb-1">
                                  {new Date(date.date).toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                  })}
                                </p>
                                <p className="text-sm text-gray-400 mb-2">
                                  <span className="font-semibold">Days Remaining:</span>{' '}
                                  <span
                                    className={
                                      date.days_remaining <= 7 ? 'text-red-400 font-bold' : ''
                                    }
                                  >
                                    {date.days_remaining} days
                                  </span>
                                </p>
                                <p className="text-sm text-gray-300 mb-1">
                                  <span className="font-semibold">Context:</span> {date.context}
                                </p>
                                <p className="text-xs text-gray-500">Source: {date.source}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Contradictions */}
                      {analysisResult.contradictions.length > 0 && (
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                          <h4 className="font-semibold text-purple-400 mb-3">
                            Contradictions Found ({analysisResult.contradictions.length})
                          </h4>
                          <div className="space-y-4">
                            {analysisResult.contradictions.map((contradiction, i) => (
                              <div
                                key={i}
                                className={`p-3 rounded border ${
                                  contradiction.severity === 'CRITICAL'
                                    ? 'bg-purple-500/10 border-purple-500/30'
                                    : 'bg-purple-500/5 border-purple-500/20'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-xs font-semibold text-gray-400">
                                    Contradiction #{i + 1}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded text-xs font-bold ${
                                      contradiction.severity === 'CRITICAL'
                                        ? 'bg-red-500/20 text-red-300'
                                        : contradiction.severity === 'HIGH'
                                          ? 'bg-orange-500/20 text-orange-300'
                                          : 'bg-yellow-500/20 text-yellow-300'
                                    }`}
                                  >
                                    {contradiction.severity}
                                  </span>
                                </div>

                                {/* Side-by-side comparison */}
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                  <div className="bg-slate-900/50 p-2 rounded">
                                    <p className="text-xs text-gray-400 mb-1">
                                      📄 {contradiction.source1}
                                    </p>
                                    <p className="text-sm text-gray-300">
                                      "{contradiction.statement1}"
                                    </p>
                                  </div>
                                  <div className="bg-slate-900/50 p-2 rounded">
                                    <p className="text-xs text-gray-400 mb-1">
                                      📄 {contradiction.source2}
                                    </p>
                                    <p className="text-sm text-gray-300">
                                      "{contradiction.statement2}"
                                    </p>
                                  </div>
                                </div>

                                <p className="text-sm text-red-300 mb-2">
                                  <span className="font-semibold">⚠️ Impact:</span>{' '}
                                  {contradiction.impact}
                                </p>
                                <p className="text-sm text-neon-mint">
                                  <span className="font-semibold">💡 Suggested Rebuttal:</span>{' '}
                                  {contradiction.rebuttal}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* No Issues Found */}
                      {analysisResult.violations.length === 0 &&
                        analysisResult.dates.length === 0 &&
                        analysisResult.contradictions.length === 0 && (
                          <div className="text-center py-12">
                            <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-400" />
                            <p className="text-gray-300 text-lg font-semibold mb-2">
                              No legal issues detected
                            </p>
                            <p className="text-gray-500 text-sm">
                              The document appears to be compliant with reviewed statutes and
                              policies.
                            </p>
                          </div>
                        )}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <FileSearch className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Click "Analyze & Extract" to process this document</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Select a document to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
