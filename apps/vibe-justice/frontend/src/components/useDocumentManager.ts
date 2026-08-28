import { useRef, useState, type ChangeEvent } from 'react'
import { documentAnalysisApi } from '../services/documentAnalysis'
import { httpClient } from '../services/httpClient'
import { isTauri, tauriAPI } from '../services/tauri'
import type { CaseType } from '../types/documentAnalysis'
import {
  Document,
  AnalysisResult,
  getFileType,
} from './documentAnalysisTypes'

export interface UseDocumentManagerReturn {
  // state
  viewMode: 'single' | 'batch'
  setViewMode: (mode: 'single' | 'batch') => void
  documents: Document[]
  selectedDoc: Document | null
  analysisResult: AnalysisResult | null
  isAnalyzing: boolean
  isExporting: boolean
  caseType: CaseType
  setCaseType: (type: CaseType) => void
  uploadError: string | null
  analysisError: string | null
  exportError: string | null
  fileInputRef: React.RefObject<HTMLInputElement | null>

  // handlers
  handleUpload: () => Promise<void>
  handleWebFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>
  analyzeDocument: (doc: Document) => Promise<void>
  selectDocument: (doc: Document) => void
  exportResults: (format: 'pdf' | 'docx' | 'txt') => Promise<void>
  printDocument: () => void
  deleteDocument: (id: string) => void
  generateExportContent: (doc: Document, analysis: AnalysisResult) => string
}

export function useDocumentManager(): UseDocumentManagerReturn {
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

  const selectDocument = (doc: Document) => {
    setSelectedDoc(doc)
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

  return {
    // state
    viewMode,
    setViewMode,
    documents,
    selectedDoc,
    analysisResult,
    isAnalyzing,
    isExporting,
    caseType,
    setCaseType,
    uploadError,
    analysisError,
    exportError,
    fileInputRef,

    // handlers
    handleUpload,
    handleWebFileChange,
    analyzeDocument,
    selectDocument,
    exportResults,
    printDocument,
    deleteDocument,
    generateExportContent,
  }
}
