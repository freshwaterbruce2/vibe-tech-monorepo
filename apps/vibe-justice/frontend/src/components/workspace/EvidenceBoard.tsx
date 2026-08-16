import { Copy, FileText, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { justiceApi, type Case, type EvidenceRecord, type ExtractionStatus } from '../../services/api'
import { EvidenceUpload } from '../tabs/evidence/EvidenceUpload'

export function EvidenceBoard({ currentCase }: { currentCase: Case | null }) {
  const [records, setRecords] = useState<EvidenceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [retryingId, setRetryingId] = useState<string | null>(null)

  const loadEvidence = useCallback(async () => {
    if (!currentCase) { setRecords([]); return }
    setLoading(true); setError('')
    try {
      setRecords(await justiceApi.listEvidence(currentCase.case_id))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load evidence.')
    } finally {
      setLoading(false)
    }
  }, [currentCase])

  useEffect(() => { void loadEvidence() }, [loadEvidence])

  const retry = async (record: EvidenceRecord) => {
    if (!currentCase) return
    setRetryingId(record.evidence_id); setError('')
    try {
      const updated = await justiceApi.retryEvidenceExtraction(currentCase.case_id, record.evidence_id)
      setRecords((existing) => existing.map((item) => item.evidence_id === updated.evidence_id ? updated : item))
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : 'Unable to retry extraction.')
    } finally {
      setRetryingId(null)
    }
  }

  if (!currentCase) {
    return <section className="flex h-full items-center justify-center bg-slate-950 p-8 text-center"><div><FileText className="mx-auto h-10 w-10 text-gray-500" /><h1 className="mt-4 text-xl font-semibold">Select a current case to view evidence</h1><p className="mt-2 text-sm text-gray-400">Evidence is always stored and listed inside one active case.</p></div></section>
  }

  return (
    <section className="h-full overflow-y-auto bg-slate-950 p-6" aria-labelledby="evidence-heading">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 id="evidence-heading" className="text-2xl font-semibold">Evidence</h1><p className="mt-1 text-sm text-gray-400">Current case: <span className="font-mono text-neon-mint">{currentCase.case_id}</span></p></div>
        <div className="flex gap-2"><button onClick={() => void loadEvidence()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/20 px-4 py-2 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button><EvidenceUpload caseId={currentCase.case_id} onUploadComplete={(record) => setRecords((existing) => [record, ...existing])} /></div>
      </header>
      {error && <p role="alert" className="mt-4 rounded-md border border-red-500/30 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
      {loading && <p role="status" className="mt-6 text-sm text-gray-400">Loading durable evidence records…</p>}
      {!loading && records.length === 0 && <div className="mt-8 rounded-lg border border-dashed border-white/20 p-8 text-center"><p className="font-medium">No evidence imported for this case.</p><p className="mt-1 text-sm text-gray-400">Use Import evidence to add a synthetic or real original intentionally.</p></div>}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {records.map((record) => <EvidenceCard key={record.evidence_id} record={record} retrying={retryingId === record.evidence_id} onRetry={() => void retry(record)} />)}
      </div>
    </section>
  )
}

function EvidenceCard({ record, retrying, onRetry }: { record: EvidenceRecord; retrying: boolean; onRetry: () => void }) {
  const extraction = record.latest_extraction
  const status = statusLabel(extraction?.status, record.lifecycle_status)
  const canRetry = extraction?.status === 'failed' || extraction?.status === 'unsupported'
  return (
    <article className="rounded-lg border border-white/10 bg-slate-900/70 p-5">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate font-semibold" title={record.original_filename}>{record.original_filename}</h2><p className="mt-1 text-xs text-gray-400">{record.detected_mime} · {formatBytes(record.byte_length)}</p></div><span className="shrink-0 rounded-full border border-white/15 px-2.5 py-1 text-xs font-medium">{status}</span></div>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-xs uppercase tracking-wide text-gray-500">Imported</dt><dd>{formatDate(record.imported_at)}</dd></div>
        <div><dt className="text-xs uppercase tracking-wide text-gray-500">Source</dt><dd>{record.source_label}</dd></div>
        {record.received_from && <div><dt className="text-xs uppercase tracking-wide text-gray-500">Received from</dt><dd>{record.received_from}</dd></div>}
        {record.evidence_date && <div><dt className="text-xs uppercase tracking-wide text-gray-500">Evidence date</dt><dd>{record.evidence_date}</dd></div>}
      </dl>
      {record.notes && <p className="mt-3 whitespace-pre-wrap text-sm text-gray-300">{record.notes}</p>}
      <div className="mt-4 flex items-center gap-2 rounded bg-black/25 px-3 py-2 font-mono text-xs"><span className="text-gray-400">SHA-256</span><span className="truncate" title={record.sha256}>{abbreviateHash(record.sha256)}</span><button aria-label={`Copy SHA-256 for ${record.original_filename}`} title="Copy full SHA-256" onClick={() => void navigator.clipboard.writeText(record.sha256)} className="ml-auto rounded p-1 hover:bg-white/10"><Copy className="h-3.5 w-3.5" /></button></div>
      {extraction?.error_message && <p className="mt-3 text-sm text-amber-300">{extraction.error_message}</p>}
      {canRetry && <button onClick={onRetry} disabled={retrying} className="mt-4 min-h-11 rounded-md border border-white/20 px-4 py-2 disabled:opacity-50">{retrying ? 'Retrying…' : 'Retry extraction'}</button>}
    </article>
  )
}

function statusLabel(status: ExtractionStatus | undefined, lifecycle: string): string {
  if (status === 'running' || status === 'pending') return 'Extracting'
  if (status === 'succeeded') return 'Ready'
  if (status === 'encrypted') return 'Encrypted'
  if (status === 'unsupported') return 'Unsupported'
  if (status === 'failed') return 'Extraction failed'
  return lifecycle === 'stored' ? 'Stored' : lifecycle
}

const abbreviateHash = (hash: string) => hash.length > 20 ? `${hash.slice(0, 12)}…${hash.slice(-8)}` : hash
const formatBytes = (bytes: number) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
const formatDate = (value: string) => { const date = new Date(value); return Number.isNaN(date.valueOf()) ? value : date.toLocaleString() }
