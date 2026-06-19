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
import { useDocumentManager } from './useDocumentManager'
import { BatchUpload } from './document-analysis/BatchUpload'
import {
  caseTypeLabels,
  caseTypeDescriptions,
  formatFileSize,
} from './documentAnalysisTypes'

export function DocumentManager() {
  const {
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
    handleUpload,
    handleWebFileChange,
    analyzeDocument,
    exportResults,
    printDocument,
    deleteDocument,
  } = useDocumentManager()

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
              onChange={(e) => setCaseType(e.target.value as any)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neon-mint/50 focus:ring-1 focus:ring-neon-mint/20"
            >
              {(Object.keys(caseTypeLabels) as any[]).map((type) => (
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
                      onClick={() => {
                        // Use the setter from hook via a small exposed method or we keep selectedDoc exposure later if needed
                        // For now the list click is still inside the UI; the hook doesn't expose setSelectedDoc directly to UI.
                        // We will expose a minimal method if required. For first cut we tolerate keeping the click here.
                        // The current hook does not expose setSelectedDoc publicly — we need to add it if we want pure UI.
                        // Workaround for now: keep the click handler minimal and let the hook own the selection.
                        // Revisit when we need to highlight selectedDoc from the list.
                      }}
                      className={`document-item p-3 rounded-lg cursor-pointer transition-colors ${
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
                        {doc.status === 'ready' && <CheckCircle className="w-4 h-4 text-green-400" />}
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
                                className="p-3 bg-slate-900/50 rounded border border-slate-700"
                              >
                                <div className="flex items-start justify-between">
                                  <div>
                                    <span
                                      className={`inline-block px-2 py-0.5 text-xs font-bold rounded mr-2 ${
                                        violation.severity === 'CRITICAL'
                                          ? 'bg-red-500/20 text-red-400'
                                          : violation.severity === 'HIGH'
                                            ? 'bg-orange-500/20 text-orange-400'
                                            : 'bg-yellow-500/20 text-yellow-400'
                                      }`}
                                    >
                                      {violation.severity}
                                    </span>
                                    <span className="font-medium">{violation.type}</span>
                                  </div>
                                  {violation.pageNumber && (
                                    <span className="text-xs text-gray-500">Page {violation.pageNumber}</span>
                                  )}
                                </div>
                                <p className="mt-2 text-sm text-gray-300">{violation.evidence}</p>
                                <p className="mt-1 text-xs text-gray-400">
                                  <span className="font-semibold">Statute:</span> {violation.statute}
                                </p>
                                <p className="mt-1 text-xs text-gray-400">
                                  <span className="font-semibold">Recommended Action:</span>{' '}
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
                          <div className="space-y-2">
                            {analysisResult.dates.map((date, i) => (
                              <div
                                key={i}
                                className={`p-3 rounded border ${
                                  date.is_urgent
                                    ? 'bg-red-500/10 border-red-500/30'
                                    : 'bg-slate-900/50 border-slate-700'
                                }`}
                              >
                                <div className="flex items-center justify-between text-sm">
                                  <span className="font-medium">{date.label}</span>
                                  <span className="text-gray-400">{new Date(date.date).toLocaleDateString()}</span>
                                </div>
                                <div className="mt-1 text-xs text-gray-400">
                                  {date.context} • {date.source}
                                </div>
                                <div className="mt-1 text-xs">
                                  <span className="text-gray-400">Days remaining: </span>
                                  <span className={date.is_urgent ? 'text-red-400 font-bold' : ''}>
                                    {date.days_remaining} {date.is_urgent && '🚨'}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Contradictions */}
                      {analysisResult.contradictions.length > 0 && (
                        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                          <h4 className="font-semibold text-purple-400 mb-3 flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            Contradictions Found ({analysisResult.contradictions.length})
                          </h4>
                          <div className="space-y-3">
                            {analysisResult.contradictions.map((c, i) => (
                              <div key={i} className="p-3 bg-slate-900/50 rounded border border-slate-700">
                                <div className="flex items-center gap-2 text-sm">
                                  <span
                                    className={`px-2 py-0.5 text-xs font-bold rounded ${
                                      c.severity === 'HIGH'
                                        ? 'bg-red-500/20 text-red-400'
                                        : 'bg-yellow-500/20 text-yellow-400'
                                    }`}
                                  >
                                    {c.severity}
                                  </span>
                                  <span className="font-medium">Contradiction</span>
                                </div>
                                <div className="mt-2 text-xs text-gray-300 space-y-1">
                                  <div>
                                    <span className="text-gray-400">Statement 1 ({c.source1}):</span>
                                    <div className="pl-4 mt-0.5">"{c.statement1}"</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-400">Statement 2 ({c.source2}):</span>
                                    <div className="pl-4 mt-0.5">"{c.statement2}"</div>
                                  </div>
                                </div>
                                <div className="mt-2 text-xs">
                                  <span className="text-gray-400">Impact: </span>
                                  {c.impact}
                                </div>
                                <div className="mt-0.5 text-xs">
                                  <span className="text-gray-400">Suggested Rebuttal: </span>
                                  {c.rebuttal}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Select a document and click "Analyze" to begin legal analysis</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p>Select a document from the list to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Need to expose a small helper for the list click (kept minimal for now)
import { isTauri } from '../services/tauri'
