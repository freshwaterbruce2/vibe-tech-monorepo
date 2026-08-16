import { fireEvent, render, screen, waitFor } from '@/test/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { justiceApi, type Case, type EvidenceRecord } from '../../services/api'
import { EvidenceBoard } from './EvidenceBoard'

vi.mock('../../services/api', () => ({
  justiceApi: { listEvidence: vi.fn(), uploadEvidence: vi.fn(), retryEvidenceExtraction: vi.fn(), getEvidenceChunks: vi.fn(), indexEvidence: vi.fn(), searchEvidence: vi.fn(), downloadEvidenceOriginal: vi.fn() },
}))

const currentCase: Case = { case_id: 'synthetic-case', name: 'Synthetic case', created_at: '2026-08-16T12:00:00Z', status: 'Active', jurisdiction: 'SC', research_goals: '', assigned_agent: '', is_archived: false, archived_at: null }
const otherCase: Case = { ...currentCase, case_id: 'other-case', name: 'Other case' }
const failedRecord: EvidenceRecord = {
  evidence_id: 'evidence-1', case_id: currentCase.case_id, original_filename: 'synthetic.txt', byte_length: 14,
  sha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', declared_mime: 'text/plain', detected_mime: 'text/plain',
  imported_at: '2026-08-16T12:30:00Z', source_label: 'Synthetic fixture', received_from: 'Test harness', notes: 'No real case data', evidence_date: null,
  lifecycle_status: 'stored', same_content_as: null,
  latest_extraction: { attempt_id: 'attempt-1', status: 'failed', extractor_name: 'text', extractor_version: '1', started_at: '2026-08-16T12:30:00Z', completed_at: '2026-08-16T12:30:01Z', page_count: null, error_code: 'synthetic_failure', error_message: 'Extraction failed safely.' },
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

describe('EvidenceBoard', () => {
  beforeEach(() => {
    vi.mocked(justiceApi.listEvidence).mockReset().mockResolvedValue([])
    vi.mocked(justiceApi.uploadEvidence).mockReset()
    vi.mocked(justiceApi.retryEvidenceExtraction).mockReset()
    vi.mocked(justiceApi.getEvidenceChunks).mockReset()
    vi.mocked(justiceApi.indexEvidence).mockReset()
    vi.mocked(justiceApi.searchEvidence).mockReset()
    vi.mocked(justiceApi.downloadEvidenceOriginal).mockReset()
  })

  it('gates evidence without a current case', () => {
    render(<EvidenceBoard currentCase={null} />)
    expect(screen.getByRole('heading', { name: /select a current case/i })).toBeInTheDocument()
    expect(justiceApi.listEvidence).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: /import evidence/i })).not.toBeInTheDocument()
  })

  it('lists provenance, hash, truthful failed status, and retries extraction', async () => {
    vi.mocked(justiceApi.listEvidence).mockResolvedValue([failedRecord])
    vi.mocked(justiceApi.retryEvidenceExtraction).mockResolvedValue({ ...failedRecord, latest_extraction: { ...failedRecord.latest_extraction!, status: 'running', error_message: null } })
    render(<EvidenceBoard currentCase={currentCase} />)
    expect(await screen.findByText('synthetic.txt')).toBeInTheDocument()
    expect(screen.getByText('Synthetic fixture')).toBeInTheDocument()
    expect(screen.getByText('Extraction failed')).toBeInTheDocument()
    expect(screen.getByText(/0123456789ab/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: /retry extraction/i }))
    await waitFor(() => expect(justiceApi.retryEvidenceExtraction).toHaveBeenCalledWith('synthetic-case', 'evidence-1'))
    expect(await screen.findByText('Extracting')).toBeInTheDocument()
  })

  it('provides an accessible provenance import dialog and reports upload errors', async () => {
    vi.mocked(justiceApi.uploadEvidence).mockRejectedValue(new Error('Upload failed: 422 synthetic rejection'))
    render(<EvidenceBoard currentCase={currentCase} />)
    await userEvent.click(screen.getByRole('button', { name: /import evidence/i }))
    expect(screen.getByRole('dialog', { name: /import evidence/i })).toBeInTheDocument()
    expect(screen.getByText(/PDF, DOCX, TXT, PNG, JPEG, or TIFF/)).toBeInTheDocument()
    const picker = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(picker, { target: { files: [new File(['synthetic'], 'synthetic.txt', { type: 'text/plain' })] } })
    await userEvent.type(screen.getByLabelText(/source label/i), 'Synthetic fixture')
    await userEvent.click(screen.getByRole('button', { name: /import original/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('synthetic rejection')
    expect(justiceApi.uploadEvidence).toHaveBeenCalledWith(expect.any(File), 'synthetic-case', expect.objectContaining({ sourceLabel: 'Synthetic fixture' }))
  })

  it('indexes extracted evidence and searches only the current case with exact source details', async () => {
    const readyRecord = { ...failedRecord, latest_extraction: { ...failedRecord.latest_extraction!, status: 'succeeded' as const, error_code: null, error_message: null } }
    vi.mocked(justiceApi.listEvidence).mockResolvedValue([readyRecord])
    vi.mocked(justiceApi.getEvidenceChunks).mockResolvedValue({ evidence_id: 'evidence-1', status: 'unindexed', chunks: [] })
    vi.mocked(justiceApi.indexEvidence).mockResolvedValue({ evidence_id: 'evidence-1', status: 'indexed', chunk_count: 2, text_sha256: 'text-hash' })
    vi.mocked(justiceApi.searchEvidence).mockResolvedValue({ query: 'repair promise', total: 1, results: [{ chunk_id: 'chunk-1', evidence_id: 'evidence-1', original_filename: 'synthetic.txt', quote: 'I will repair it tomorrow.', ordinal: 0, page_number: null, paragraph_index: 3, char_start: 40, char_end: 66, score: 2, match_terms: ['repair'], text_sha256: 'text-hash', extraction_attempt_id: 'attempt-1' }] })
    render(<EvidenceBoard currentCase={currentCase} />)
    await userEvent.click(await screen.findByRole('button', { name: /make searchable/i }))
    await waitFor(() => expect(justiceApi.indexEvidence).toHaveBeenCalledWith('synthetic-case', 'evidence-1'))
    expect(await screen.findByText(/2 searchable passages/i)).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/search terms/i), 'repair promise')
    await userEvent.click(screen.getByRole('button', { name: /^search evidence$/i }))
    await waitFor(() => expect(justiceApi.searchEvidence).toHaveBeenCalledWith('synthetic-case', 'repair promise'))
    expect(await screen.findByText(/I will repair it tomorrow/i)).toBeInTheDocument()
    expect(screen.getByText('Paragraph 3')).toBeInTheDocument()
    expect(screen.getByText('Evidence evidence-1')).toBeInTheDocument()
    expect(screen.getByText('Matched: repair')).toBeInTheDocument()
    expect(screen.queryByText(/broke the law|violation/i)).not.toBeInTheDocument()
  })

  it('shows truthful empty and failed search states', async () => {
    vi.mocked(justiceApi.searchEvidence).mockResolvedValueOnce({ query: 'missing', total: 0, results: [] }).mockRejectedValueOnce(new Error('Search evidence failed: 503 unavailable'))
    render(<EvidenceBoard currentCase={currentCase} />)
    const input = screen.getByLabelText(/search terms/i)
    await userEvent.type(input, 'missing')
    await userEvent.click(screen.getByRole('button', { name: /^search evidence$/i }))
    expect(await screen.findByText(/No matching passages found/i)).toBeInTheDocument()
    await userEvent.clear(input); await userEvent.type(input, 'failure')
    await userEvent.click(screen.getByRole('button', { name: /^search evidence$/i }))
    expect(await screen.findByText(/503 unavailable/i)).toHaveAttribute('role', 'alert')
  })

  it('does not show a late evidence load from a previously selected case', async () => {
    const lateCaseLoad = deferred<EvidenceRecord[]>()
    vi.mocked(justiceApi.listEvidence).mockReturnValueOnce(lateCaseLoad.promise).mockResolvedValueOnce([])
    const { rerender } = render(<EvidenceBoard currentCase={currentCase} />)
    await waitFor(() => expect(justiceApi.listEvidence).toHaveBeenCalledWith('synthetic-case'))
    rerender(<EvidenceBoard currentCase={otherCase} />)
    await waitFor(() => expect(justiceApi.listEvidence).toHaveBeenCalledWith('other-case'))
    lateCaseLoad.resolve([failedRecord])
    await waitFor(() => expect(screen.getByText(/Current case:/)).toHaveTextContent('other-case'))
    expect(screen.queryByText('synthetic.txt')).not.toBeInTheDocument()
  })

  it('does not show late search results from a previously selected case', async () => {
    const lateSearch = deferred<Awaited<ReturnType<typeof justiceApi.searchEvidence>>>()
    vi.mocked(justiceApi.searchEvidence).mockReturnValue(lateSearch.promise)
    const { rerender } = render(<EvidenceBoard currentCase={currentCase} />)
    await userEvent.type(screen.getByLabelText(/search terms/i), 'private case A words')
    await userEvent.click(screen.getByRole('button', { name: /^search evidence$/i }))
    await waitFor(() => expect(justiceApi.searchEvidence).toHaveBeenCalledWith('synthetic-case', 'private case A words'))
    rerender(<EvidenceBoard currentCase={otherCase} />)
    lateSearch.resolve({ query: 'private case A words', total: 1, results: [{ chunk_id: 'late', evidence_id: 'evidence-1', original_filename: 'case-a-secret.txt', quote: 'Case A private passage', ordinal: 0, page_number: 1, paragraph_index: null, char_start: 0, char_end: 22, score: 1, match_terms: ['private'], text_sha256: 'hash', extraction_attempt_id: 'attempt-1' }] })
    await waitFor(() => expect(screen.getByText(/Current case:/)).toHaveTextContent('other-case'))
    expect(screen.queryByText(/Case A private passage/i)).not.toBeInTheDocument()
    expect(screen.queryByText('case-a-secret.txt')).not.toBeInTheDocument()
  })

  it('does not apply a late index result to the newly selected case', async () => {
    const readyRecord = { ...failedRecord, latest_extraction: { ...failedRecord.latest_extraction!, status: 'succeeded' as const, error_code: null, error_message: null } }
    const lateIndex = deferred<Awaited<ReturnType<typeof justiceApi.indexEvidence>>>()
    vi.mocked(justiceApi.listEvidence).mockResolvedValue([readyRecord])
    vi.mocked(justiceApi.getEvidenceChunks).mockResolvedValue({ evidence_id: 'evidence-1', status: 'unindexed', chunks: [] })
    vi.mocked(justiceApi.indexEvidence).mockReturnValue(lateIndex.promise)
    const { rerender } = render(<EvidenceBoard currentCase={currentCase} />)
    await userEvent.click(await screen.findByRole('button', { name: /make searchable/i }))
    rerender(<EvidenceBoard currentCase={otherCase} />)
    await waitFor(() => expect(justiceApi.listEvidence).toHaveBeenCalledWith('other-case'))
    lateIndex.resolve({ evidence_id: 'evidence-1', status: 'indexed', chunk_count: 99, text_sha256: 'case-a-hash' })
    expect(await screen.findByRole('button', { name: /make searchable/i })).toBeInTheDocument()
    expect(screen.queryByText(/99 searchable passages/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /rebuild search index/i })).not.toBeInTheDocument()
  })

  it('keeps the newest same-case search when an older query resolves last', async () => {
    const olderSearch = deferred<Awaited<ReturnType<typeof justiceApi.searchEvidence>>>()
    const newerSearch = deferred<Awaited<ReturnType<typeof justiceApi.searchEvidence>>>()
    vi.mocked(justiceApi.searchEvidence).mockReturnValueOnce(olderSearch.promise).mockReturnValueOnce(newerSearch.promise)
    render(<EvidenceBoard currentCase={currentCase} />)
    const input = screen.getByLabelText(/search terms/i)
    await userEvent.type(input, 'older query')
    await userEvent.click(screen.getByRole('button', { name: /^search evidence$/i }))
    await userEvent.clear(input); await userEvent.type(input, 'newer query')
    await userEvent.click(screen.getByRole('button', { name: /^search evidence$/i }))
    newerSearch.resolve({ query: 'newer query', total: 1, results: [{ chunk_id: 'newer', evidence_id: 'evidence-2', original_filename: 'newer.txt', quote: 'Newest result remains visible', ordinal: 0, page_number: 2, paragraph_index: null, char_start: 0, char_end: 29, score: 2, match_terms: ['newer'], text_sha256: 'newer-hash', extraction_attempt_id: 'attempt-2' }] })
    expect(await screen.findByText(/Newest result remains visible/i)).toBeInTheDocument()
    olderSearch.resolve({ query: 'older query', total: 1, results: [{ chunk_id: 'older', evidence_id: 'evidence-1', original_filename: 'older.txt', quote: 'Stale result must stay hidden', ordinal: 0, page_number: 1, paragraph_index: null, char_start: 0, char_end: 28, score: 1, match_terms: ['older'], text_sha256: 'older-hash', extraction_attempt_id: 'attempt-1' }] })
    await olderSearch.promise
    expect(screen.getByText(/Newest result remains visible/i)).toBeInTheDocument()
    expect(screen.queryByText(/Stale result must stay hidden/i)).not.toBeInTheDocument()
  })
})
