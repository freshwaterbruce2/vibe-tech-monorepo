import { Copy, Download, FileSearch, FileText, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { justiceApi, type Case, type EvidenceIndexStatus, type EvidenceRecord, type EvidenceSearchResult, type ExtractionStatus } from '../../services/api'
import { EvidenceUpload } from '../tabs/evidence/EvidenceUpload'

export function EvidenceBoard({ currentCase }: { currentCase: Case | null }) {
  const activeCaseIdRef = useRef<string | null>(currentCase?.case_id ?? null)
  activeCaseIdRef.current = currentCase?.case_id ?? null
  const loadGenerationRef = useRef(0)
  const searchGenerationRef = useRef(0)
  const indexGenerationRef = useRef(0)
  const retryGenerationRef = useRef(0)
  const [records, setRecords] = useState<EvidenceRecord[]>([])
  const [recordsCaseId, setRecordsCaseId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [retryingId, setRetryingId] = useState<string | null>(null)
  const [indexingId, setIndexingId] = useState<string | null>(null)
  const [indexStatuses, setIndexStatuses] = useState<Record<string, EvidenceIndexStatus>>({})
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [searchResults, setSearchResults] = useState<EvidenceSearchResult[] | null>(null)
  const [searchResultsCaseId, setSearchResultsCaseId] = useState<string | null>(null)

  const loadEvidence = useCallback(async () => {
    const generation = ++loadGenerationRef.current
    setSearchResults(null); setSearchError(''); setIndexStatuses({})
    if (!currentCase) { setRecords([]); setRecordsCaseId(null); return }
    const caseId = currentCase.case_id
    setLoading(true); setError('')
    try {
      const loaded = await justiceApi.listEvidence(caseId)
      if (activeCaseIdRef.current !== caseId || loadGenerationRef.current !== generation) return
      setRecords(loaded)
      setRecordsCaseId(caseId)
      const ready = loaded.filter((record) => record.latest_extraction?.status === 'succeeded')
      const statuses = await Promise.all(ready.map(async (record) => {
        const response = await justiceApi.getEvidenceChunks(caseId, record.evidence_id)
        return { evidence_id: response.evidence_id, status: response.status, chunk_count: response.chunks.length, text_sha256: response.chunks[0]?.text_sha256 ?? null }
      }))
      if (activeCaseIdRef.current !== caseId || loadGenerationRef.current !== generation) return
      setIndexStatuses(Object.fromEntries(statuses.map((status) => [status.evidence_id, status])))
    } catch (loadError) {
      if (activeCaseIdRef.current !== caseId || loadGenerationRef.current !== generation) return
      setError(loadError instanceof Error ? loadError.message : 'Unable to load evidence.')
    } finally {
      if (activeCaseIdRef.current === caseId && loadGenerationRef.current === generation) setLoading(false)
    }
  }, [currentCase])

  useEffect(() => {
    loadGenerationRef.current += 1; searchGenerationRef.current += 1; indexGenerationRef.current += 1; retryGenerationRef.current += 1
    setRetryingId(null); setIndexingId(null); setSearching(false); setQuery('')
  }, [currentCase?.case_id])

  useEffect(() => { void loadEvidence() }, [loadEvidence])

  const retry = async (record: EvidenceRecord) => {
    if (!currentCase) return
    const caseId = currentCase.case_id
    const generation = ++retryGenerationRef.current
    setRetryingId(record.evidence_id); setError('')
    try {
      const updated = await justiceApi.retryEvidenceExtraction(caseId, record.evidence_id)
      if (activeCaseIdRef.current !== caseId || retryGenerationRef.current !== generation) return
      setRecords((existing) => existing.map((item) => item.evidence_id === updated.evidence_id ? updated : item))
    } catch (retryError) {
      if (activeCaseIdRef.current !== caseId || retryGenerationRef.current !== generation) return
      setError(retryError instanceof Error ? retryError.message : 'Unable to retry extraction.')
    } finally {
      if (activeCaseIdRef.current === caseId && retryGenerationRef.current === generation) setRetryingId(null)
    }
  }

  const indexEvidence = async (record: EvidenceRecord) => {
    if (!currentCase) return
    const caseId = currentCase.case_id
    const generation = ++indexGenerationRef.current
    setIndexingId(record.evidence_id); setError('')
    try {
      const status = await justiceApi.indexEvidence(caseId, record.evidence_id)
      if (activeCaseIdRef.current !== caseId || indexGenerationRef.current !== generation) return
      setIndexStatuses((existing) => ({ ...existing, [record.evidence_id]: status }))
    } catch (indexError) {
      if (activeCaseIdRef.current !== caseId || indexGenerationRef.current !== generation) return
      setError(indexError instanceof Error ? indexError.message : 'Unable to index evidence.')
    } finally {
      if (activeCaseIdRef.current === caseId && indexGenerationRef.current === generation) setIndexingId(null)
    }
  }

  const search = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!currentCase || !query.trim()) return
    const caseId = currentCase.case_id
    const generation = ++searchGenerationRef.current
    setSearching(true); setSearchError('')
    try {
      const response = await justiceApi.searchEvidence(caseId, query.trim())
      if (activeCaseIdRef.current !== caseId || searchGenerationRef.current !== generation) return
      setSearchResults(response.results)
      setSearchResultsCaseId(caseId)
    } catch (searchFailure) {
      if (activeCaseIdRef.current !== caseId || searchGenerationRef.current !== generation) return
      setSearchResults(null)
      setSearchError(searchFailure instanceof Error ? searchFailure.message : 'Unable to search evidence.')
    } finally {
      if (activeCaseIdRef.current === caseId && searchGenerationRef.current === generation) setSearching(false)
    }
  }

  const download = async (evidenceId: string, filename: string) => {
    if (!currentCase) return
    const caseId = currentCase.case_id
    setError('')
    try {
      const blob = await justiceApi.downloadEvidenceOriginal(caseId, evidenceId)
      if (activeCaseIdRef.current !== caseId) return
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click()
      URL.revokeObjectURL(url)
    } catch (downloadError) {
      if (activeCaseIdRef.current !== caseId) return
      setError(downloadError instanceof Error ? downloadError.message : 'Unable to download evidence.')
    }
  }

  if (!currentCase) {
    return <section className="flex h-full items-center justify-center bg-slate-950 p-8 text-center"><div><FileText className="mx-auto h-10 w-10 text-gray-500" /><h1 className="mt-4 text-xl font-semibold">Select a current case to view evidence</h1><p className="mt-2 text-sm text-gray-400">Evidence is always stored and listed inside one active case.</p></div></section>
  }

  const visibleRecords = recordsCaseId === currentCase.case_id ? records : []
  const visibleSearchResults = searchResultsCaseId === currentCase.case_id ? searchResults : null

  return (
    <section className="h-full overflow-y-auto bg-slate-950 p-6" aria-labelledby="evidence-heading">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><h1 id="evidence-heading" className="text-2xl font-semibold">Evidence</h1><p className="mt-1 text-sm text-gray-400">Current case: <span className="font-mono text-neon-mint">{currentCase.case_id}</span></p></div>
        <div className="flex gap-2"><button onClick={() => void loadEvidence()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/20 px-4 py-2 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button><EvidenceUpload caseId={currentCase.case_id} onUploadComplete={(record) => { setRecordsCaseId(currentCase.case_id); setRecords((existing) => [record, ...existing]) }} /></div>
      </header>
      {error && <p role="alert" className="mt-4 rounded-md border border-red-500/30 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
      <section className="mt-6 rounded-lg border border-white/10 bg-slate-900/70 p-5" aria-labelledby="evidence-search-heading">
        <h2 id="evidence-search-heading" className="flex items-center gap-2 text-lg font-semibold"><FileSearch className="h-5 w-5" /> Search this case's evidence</h2>
        <p className="mt-1 text-sm text-gray-400">Find exact passages in indexed evidence. Results are source excerpts, not legal conclusions.</p>
        <form onSubmit={(event) => void search(event)} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="evidence-query" className="sr-only">Search terms</label>
          <input id="evidence-query" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Words or a phrase from your evidence" className="min-h-11 flex-1 rounded-md border border-white/20 bg-slate-950 px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neon-mint" />
          <button type="submit" disabled={!query.trim()} className="min-h-11 rounded-md bg-neon-mint px-5 font-semibold text-slate-950 disabled:opacity-50">Search evidence</button>
        </form>
        {searching && <p role="status" className="mt-3 text-sm text-gray-400">Searching only the current case…</p>}
        {searchError && <p role="alert" className="mt-3 text-sm text-red-300">{searchError}</p>}
        {visibleSearchResults?.length === 0 && <p className="mt-4 rounded-md border border-dashed border-white/20 p-4 text-sm">No matching passages found. Try different words, or index a ready evidence item below.</p>}
        {visibleSearchResults && visibleSearchResults.length > 0 && <div className="mt-4 space-y-3" aria-live="polite">{visibleSearchResults.map((result) => <SearchResultCard key={result.chunk_id} result={result} onDownload={() => void download(result.evidence_id, result.original_filename)} />)}</div>}
      </section>
      {loading && <p role="status" className="mt-6 text-sm text-gray-400">Loading durable evidence records…</p>}
      {!loading && visibleRecords.length === 0 && <div className="mt-8 rounded-lg border border-dashed border-white/20 p-8 text-center"><p className="font-medium">No evidence imported for this case.</p><p className="mt-1 text-sm text-gray-400">Use Import evidence to add a synthetic or real original intentionally.</p></div>}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {visibleRecords.map((record) => <EvidenceCard key={record.evidence_id} record={record} retrying={retryingId === record.evidence_id} indexing={indexingId === record.evidence_id} indexStatus={indexStatuses[record.evidence_id]} onRetry={() => void retry(record)} onIndex={() => void indexEvidence(record)} onDownload={() => void download(record.evidence_id, record.original_filename)} />)}
      </div>
    </section>
  )
}

function EvidenceCard({ record, retrying, indexing, indexStatus, onRetry, onIndex, onDownload }: { record: EvidenceRecord; retrying: boolean; indexing: boolean; indexStatus?: EvidenceIndexStatus; onRetry: () => void; onIndex: () => void; onDownload: () => void }) {
  const extraction = record.latest_extraction
  const status = statusLabel(extraction?.status, record.lifecycle_status)
  const canRetry = extraction?.status === 'failed' || extraction?.status === 'unsupported'
  return (
    <article id={`evidence-${record.evidence_id}`} className="scroll-mt-4 rounded-lg border border-white/10 bg-slate-900/70 p-5">
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
      <p className="mt-3 text-sm text-gray-300">Search index: {indexStatus?.status === 'indexed' ? `${indexStatus.chunk_count} searchable passages` : extraction?.status === 'succeeded' ? 'Not indexed' : 'Waiting for extraction'}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {canRetry && <button onClick={onRetry} disabled={retrying} className="min-h-11 rounded-md border border-white/20 px-4 py-2 disabled:opacity-50">{retrying ? 'Retrying…' : 'Retry extraction'}</button>}
        {extraction?.status === 'succeeded' && <button onClick={onIndex} disabled={indexing} className="min-h-11 rounded-md border border-white/20 px-4 py-2 disabled:opacity-50">{indexing ? 'Indexing…' : indexStatus?.status === 'indexed' ? 'Rebuild search index' : 'Make searchable'}</button>}
        <button onClick={onDownload} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/20 px-4 py-2"><Download className="h-4 w-4" /> Download original</button>
      </div>
    </article>
  )
}

function SearchResultCard({ result, onDownload }: { result: EvidenceSearchResult; onDownload: () => void }) {
  const locator = result.page_number !== null ? `Page ${result.page_number}` : result.paragraph_index !== null ? `Paragraph ${result.paragraph_index}` : `Characters ${result.char_start}–${result.char_end}`
  const explanation = result.match_terms.length > 0 ? `Matched: ${result.match_terms.join(', ')}` : 'Relevant words appear in this passage.'
  return <article className="rounded-md border border-white/10 bg-slate-950/70 p-4">
    <blockquote className="whitespace-pre-wrap border-l-2 border-neon-mint pl-3 text-sm text-gray-100">“{result.quote}”</blockquote>
    <dl className="mt-3 grid gap-2 text-xs text-gray-400 sm:grid-cols-2"><div><dt className="sr-only">Source file</dt><dd>{result.original_filename}</dd></div><div><dt className="sr-only">Locator</dt><dd>{locator}</dd></div><div><dt className="sr-only">Evidence identifier</dt><dd className="font-mono">Evidence {result.evidence_id}</dd></div><div><dt className="sr-only">Relevance</dt><dd>{explanation}</dd></div></dl>
    <div className="mt-3 flex flex-wrap gap-2"><a href={`#evidence-${result.evidence_id}`} className="inline-flex min-h-11 items-center rounded-md border border-white/20 px-3 py-2">View evidence metadata</a><button onClick={onDownload} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/20 px-3 py-2"><Download className="h-4 w-4" /> Download original</button></div>
  </article>
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
