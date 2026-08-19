import { render, screen, waitFor } from '@/test/utils/test-utils'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  justiceApi,
  type Case,
  type EvidenceRecord,
  type IssueFindingDetail,
  type LegalPack,
} from '../../services/api'
import { AnalysisPanel } from './AnalysisPanel'
vi.mock('../../services/api', () => ({
  justiceApi: {
    listEvidence: vi.fn(),
    listLegalPacks: vi.fn(),
    getEvidenceChunks: vi.fn(),
    analyzePotentialIssues: vi.fn(),
    setIssueDisposition: vi.fn(),
    downloadEvidenceOriginal: vi.fn(),
  },
}))
const currentCase: Case = {
  case_id: 'case-a',
  name: 'Case A',
  created_at: '2026-08-16',
  status: 'Active',
  jurisdiction: 'South Carolina',
  research_goals: '',
  assigned_agent: '',
  is_archived: false,
  archived_at: null,
}
const evidence: EvidenceRecord = {
  evidence_id: 'ev-1',
  case_id: 'case-a',
  original_filename: 'message.txt',
  byte_length: 10,
  sha256: 'hash',
  declared_mime: 'text/plain',
  detected_mime: 'text/plain',
  imported_at: '2026-08-16',
  source_label: 'Synthetic',
  received_from: null,
  notes: null,
  evidence_date: null,
  lifecycle_status: 'stored',
  same_content_as: null,
  latest_extraction: {
    attempt_id: 'a',
    status: 'succeeded',
    started_at: '2026',
    completed_at: '2026',
    page_count: 1,
    error_code: null,
    error_message: null,
  },
}
const pack: LegalPack = {
  pack_id: 'sc-rlt',
  jurisdiction: 'South Carolina',
  matter_type: 'residential landlord-tenant',
  version: '1',
  as_of: '2025 Session',
  status: 'source_checked',
  retrieval_status: 'offline_verified',
  approval_status: 'not_approved_for_matching',
  retrieved_at: '2026',
  sha256: 'packhash',
  sources: [],
}
const finding: IssueFindingDetail = {
  finding_id: 'f1',
  run_id: 'r1',
  case_id: 'case-a',
  issue_key: 'repair',
  title: 'Possible repair issue',
  label: 'missing_facts',
  rationale: 'Evidence language is related to the cited element.',
  confidence: 'moderate',
  source_id: 'law1',
  element_id: 'el1',
  created_at: '2026',
  latest_disposition: null,
  support_citations: [
    {
      citation_id: 'c1',
      kind: 'support',
      chunk_id: 'ch',
      evidence_id: 'ev-1',
      original_filename: 'message.txt',
      provenance: 'Synthetic',
      imported_at: '2026',
      quote: 'I will not repair it.',
      ordinal: 0,
      page_number: 1,
      paragraph_index: null,
      char_start: 0,
      char_end: 21,
      source_id: null,
      locator: null,
      authority_title: null,
      canonical_url: null,
      retrieved_at: null,
      as_of: null,
      source_status: null,
      approval_status: null,
      text_sha256: 'texthash',
    },
  ],
  contrary_citations: [],
  legal_citations: [
    {
      citation_id: 'c2',
      kind: 'legal',
      chunk_id: null,
      evidence_id: null,
      original_filename: null,
      provenance: null,
      imported_at: null,
      quote: 'A landlord shall maintain fit premises.',
      ordinal: null,
      page_number: null,
      paragraph_index: null,
      char_start: null,
      char_end: null,
      source_id: 'law1',
      locator: 'Section 440',
      authority_title: 'S.C. Code § 27-40-440',
      canonical_url: 'https://example.test/official',
      retrieved_at: '2026',
      as_of: '2025 Session',
      source_status: 'source_checked',
      approval_status: 'not_approved_for_matching',
      text_sha256: 'lawhash',
    },
  ],
  missing_facts: [
    { missing_id: 'm1', fact_key: 'notice', description: 'Whether written notice was delivered.' },
  ],
  qualifications: [
    {
      qualification_id: 'q1',
      code: 'scope',
      description: 'Applicability and exclusions require review.',
    },
  ],
  dispositions: [],
  element_matrix: [
    {
      element_id: 'el1',
      condition_key: 'notice',
      condition_text: 'Whether notice was delivered.',
      authority_quote: 'Maintain fit premises.',
      legal_locator: 'Section 440',
      status: 'missing',
      support_citation_ids: ['c1'],
      contrary_citation_ids: [],
      missing_fact_ids: ['m1'],
    },
  ],
  safe_next_steps: ['Review exact excerpts.'],
  warnings: ['This is not a legal conclusion.'],
}
const secondFinding: IssueFindingDetail = { ...finding, finding_id: 'f2', issue_key: 'notice', title: 'Possible notice issue', dispositions: [] }
function deferred<T>() { let resolve!: (value:T)=>void; const promise=new Promise<T>((done)=>{resolve=done}); return {promise,resolve} }
describe('AnalysisPanel', () => {
  beforeEach(() => {
    vi.mocked(justiceApi.listEvidence).mockResolvedValue([evidence])
    vi.mocked(justiceApi.listLegalPacks).mockResolvedValue({ packs: [pack] })
    vi.mocked(justiceApi.getEvidenceChunks).mockResolvedValue({
      evidence_id: 'ev-1',
      status: 'indexed',
      chunks: [
        {
          chunk_id: 'ch',
          evidence_id: 'ev-1',
          ordinal: 0,
          quote: 'text',
          page_number: 1,
          paragraph_index: null,
          char_start: 0,
          char_end: 4,
          text_sha256: 'h',
          extraction_attempt_id: 'a',
        },
      ],
    })
    vi.mocked(justiceApi.analyzePotentialIssues).mockResolvedValue({
      run: {
        run_id: 'r1',
        case_id: 'case-a',
        pack_id: 'sc-rlt',
        engine_id: 'e',
        ruleset_id: 'r',
        ruleset_sha256: 'ruleset-hash',
        screening_status: 'approved_for_candidate_screening',
        input_sha256: 'i',
        input_manifest: { case_id: 'case-a' },
        status: 'completed',
        created_at: '2026',
        completed_at: '2026',
        pack_status: 'source_checked',
        approval_status: 'not_approved_for_matching',
      },
      findings: [finding],
    })
    vi.mocked(justiceApi.setIssueDisposition).mockResolvedValue({
      disposition_id: 'd1',
      finding_id: 'f1',
      version: 1,
      value: 'needs_review',
      note: null,
      created_at: '2026',
    })
  })
  it('gates without a current case', () => {
    render(<AnalysisPanel currentCase={null} />)
    expect(screen.getByRole('heading', { name: /select a current case/i })).toBeInTheDocument()
  })
  it('shows preflight, selected evidence request, grounded candidate, and disposition', async () => {
    render(<AnalysisPanel currentCase={currentCase} />)
    expect(await screen.findByText('Zero data leaves this device')).toBeInTheDocument()
    expect(screen.getByText(/not_approved_for_matching/)).toBeInTheDocument()
    await userEvent.click(screen.getByLabelText(/Selected evidence/i))
    await userEvent.click(screen.getByLabelText(/message.txt/i))
    await userEvent.click(screen.getByRole('button', { name: /review potential issues locally/i }))
    await waitFor(() =>
      expect(justiceApi.analyzePotentialIssues).toHaveBeenCalledWith(
        'case-a',
        expect.objectContaining({ evidence_ids: ['ev-1'] })
      )
    )
    expect(vi.mocked(justiceApi.analyzePotentialIssues).mock.calls[0]?.[1]).not.toHaveProperty('pack_id')
    expect(await screen.findByText('Possible repair issue')).toBeInTheDocument()
    expect(screen.getByText(/I will not repair it/i)).toBeInTheDocument()
    expect(screen.getByText(/S.C. Code § 27-40-440/i)).toBeInTheDocument()
    expect(screen.getByText(/Whether written notice/i)).toBeInTheDocument()
    expect(screen.queryByText(/case won|guilty|violation/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/evidence-supported/i)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'needs review' }))
    await waitFor(() =>
      expect(justiceApi.setIssueDisposition).toHaveBeenCalledWith('case-a', 'f1', 'needs_review')
    )
  })
  it('preflights the deterministically newest compatible pack',async()=>{vi.mocked(justiceApi.listLegalPacks).mockResolvedValue({packs:[pack,{...pack,pack_id:'sc-rlt-new',version:'2',as_of:'2026 Session',retrieved_at:'2027'}]});render(<AnalysisPanel currentCase={currentCase}/>);expect(await screen.findByText('sc-rlt-new · 2')).toBeInTheDocument();expect(screen.getByText('2026 Session')).toBeInTheDocument()})
  it('synchronously hides same-ID findings when the current case changes',async()=>{const {rerender}=render(<AnalysisPanel currentCase={currentCase}/>);await userEvent.click(await screen.findByRole('button',{name:/review potential issues locally/i}));expect(await screen.findByText('Possible repair issue')).toBeInTheDocument();rerender(<AnalysisPanel currentCase={{...currentCase,case_id:'case-b',name:'Case B'}}/>);expect(screen.queryByText('Possible repair issue')).not.toBeInTheDocument()})
  it('reconciles concurrent dispositions independently per finding',async()=>{vi.mocked(justiceApi.analyzePotentialIssues).mockResolvedValue({run:{run_id:'r1',case_id:'case-a',pack_id:'sc-rlt',engine_id:'e',ruleset_id:'r',ruleset_sha256:'rh',screening_status:'approved_for_candidate_screening',input_sha256:'i',input_manifest:{},status:'completed',created_at:'2026',completed_at:'2026',pack_status:'source_checked',approval_status:'not_approved_for_matching'},findings:[finding,secondFinding]});const first=deferred<Awaited<ReturnType<typeof justiceApi.setIssueDisposition>>>();const second=deferred<Awaited<ReturnType<typeof justiceApi.setIssueDisposition>>>();vi.mocked(justiceApi.setIssueDisposition).mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);render(<AnalysisPanel currentCase={currentCase}/>);await userEvent.click(await screen.findByRole('button',{name:/review potential issues locally/i}));const buttons=await screen.findAllByRole('button',{name:'needs review'});await userEvent.click(buttons[0]!);await userEvent.click(buttons[1]!);second.resolve({disposition_id:'d2',finding_id:'f2',version:1,value:'needs_review',note:null,created_at:'2026'});first.resolve({disposition_id:'d1',finding_id:'f1',version:1,value:'needs_review',note:null,created_at:'2026'});await waitFor(()=>expect(screen.getAllByRole('button',{name:'needs review'}).every((button)=>button.getAttribute('aria-pressed')==='true')).toBe(true))})
})
