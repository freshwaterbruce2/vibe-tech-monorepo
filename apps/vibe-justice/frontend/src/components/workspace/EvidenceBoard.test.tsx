import { fireEvent, render, screen, waitFor } from '@/test/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { justiceApi, type Case, type EvidenceRecord } from '../../services/api'
import { EvidenceBoard } from './EvidenceBoard'

vi.mock('../../services/api', () => ({
  justiceApi: { listEvidence: vi.fn(), uploadEvidence: vi.fn(), retryEvidenceExtraction: vi.fn() },
}))

const currentCase: Case = { case_id: 'synthetic-case', name: 'Synthetic case', created_at: '2026-08-16T12:00:00Z', status: 'Active', jurisdiction: 'SC', research_goals: '', assigned_agent: '', is_archived: false, archived_at: null }
const failedRecord: EvidenceRecord = {
  evidence_id: 'evidence-1', case_id: currentCase.case_id, original_filename: 'synthetic.txt', byte_length: 14,
  sha256: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', declared_mime: 'text/plain', detected_mime: 'text/plain',
  imported_at: '2026-08-16T12:30:00Z', source_label: 'Synthetic fixture', received_from: 'Test harness', notes: 'No real case data', evidence_date: null,
  lifecycle_status: 'stored', same_content_as: null,
  latest_extraction: { attempt_id: 'attempt-1', status: 'failed', extractor_name: 'text', extractor_version: '1', started_at: '2026-08-16T12:30:00Z', completed_at: '2026-08-16T12:30:01Z', page_count: null, error_code: 'synthetic_failure', error_message: 'Extraction failed safely.' },
}

describe('EvidenceBoard', () => {
  beforeEach(() => {
    vi.mocked(justiceApi.listEvidence).mockReset().mockResolvedValue([])
    vi.mocked(justiceApi.uploadEvidence).mockReset()
    vi.mocked(justiceApi.retryEvidenceExtraction).mockReset()
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
})
