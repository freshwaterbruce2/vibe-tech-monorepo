import type { CompleteAnalysisResponse } from '../types/documentAnalysis'

export interface Document {
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
export type AnalysisResult = CompleteAnalysisResponse

export type { CaseType } from '../types/documentAnalysis'
export { CASE_TYPE_LABELS as caseTypeLabels } from '../types/documentAnalysis'
export { CASE_TYPE_DESCRIPTIONS as caseTypeDescriptions } from '../types/documentAnalysis'

export const getFileType = (filename: string): Document['type'] => {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return 'image'
  if (ext === 'pdf') return 'pdf'
  if (ext === 'docx') return 'docx'
  return 'txt'
}

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
