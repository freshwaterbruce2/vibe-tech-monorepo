import { AlertTriangle, Download, ExternalLink, Scale } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  justiceApi,
  type Case,
  type EvidenceRecord,
  type IssueCitation,
  type IssueDispositionValue,
  type IssueFindingDetail,
  type IssueRun,
  type LegalPack,
} from '../../services/api'

export function AnalysisPanel({ currentCase }: { currentCase: Case | null }) {
  const caseRef = useRef(currentCase?.case_id ?? null)
  caseRef.current = currentCase?.case_id ?? null
  const generationRef = useRef(0)
  const dispositionGenerationsRef = useRef(new Map<string, number>())
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([])
  const [packs, setPacks] = useState<LegalPack[]>([])
  const [packId, setPackId] = useState('')
  const [mode, setMode] = useState<'all' | 'selected'>('all')
  const [selected, setSelected] = useState<string[]>([])
  const [findings, setFindings] = useState<IssueFindingDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preparedCaseId, setPreparedCaseId] = useState<string | null>(null)
  const [findingsCaseId, setFindingsCaseId] = useState<string | null>(null)
  const [run, setRun] = useState<IssueRun | null>(null)

  useEffect(() => {
    const caseId = currentCase?.case_id
    const generation = ++generationRef.current
    setEvidence([])
    setPacks([])
    setPackId('')
    setSelected([])
    setFindings([])
    setRun(null)
    setError('')
    if (!caseId) return
    setLoading(true)
    void Promise.all([justiceApi.listEvidence(caseId), justiceApi.listLegalPacks()])
      .then(async ([records, inventory]) => {
        const ready = await Promise.all(
          records
            .filter((record) => record.latest_extraction?.status === 'succeeded')
            .map(async (record) => ({
              record,
              chunks: await justiceApi.getEvidenceChunks(caseId, record.evidence_id),
            }))
        )
        if (caseRef.current !== caseId || generationRef.current !== generation) return
        setEvidence(
          ready.filter((item) => item.chunks.chunks.length > 0).map((item) => item.record)
        )
        setPacks(inventory.packs)
        setPreparedCaseId(caseId)
        setPackId(newestCompatiblePack(inventory.packs)?.pack_id ?? '')
      })
      .catch((failure) => {
        if (caseRef.current === caseId && generationRef.current === generation)
          setError(
            failure instanceof Error ? failure.message : 'Unable to prepare potential issues.'
          )
      })
      .finally(() => {
        if (caseRef.current === caseId && generationRef.current === generation) setLoading(false)
      })
  }, [currentCase?.case_id])

  if (!currentCase)
    return (
      <section className="rounded-lg border border-white/10 bg-slate-900 p-6 text-center">
        <Scale className="mx-auto h-8 w-8 text-gray-500" />
        <h2 className="mt-3 text-lg font-semibold">
          Select a current case to review potential issues
        </h2>
      </section>
    )
  const prepared = preparedCaseId === currentCase.case_id
  const visibleEvidence = prepared ? evidence : []
  const pack = prepared ? packs.find((item) => item.pack_id === packId) : undefined
  const visibleFindings = findingsCaseId === currentCase.case_id ? findings : []
  const visibleRun = findingsCaseId === currentCase.case_id ? run : null
  const analyze = async () => {
    const caseId = currentCase.case_id
    const generation = ++generationRef.current
    setLoading(true)
    setError('')
    setFindings([])
    setRun(null)
    try {
      const response = await justiceApi.analyzePotentialIssues(caseId, {
        matter_type: 'residential landlord-tenant',
        evidence_ids: mode === 'selected' ? selected : undefined,
      })
      if (caseRef.current === caseId && generationRef.current === generation) {
        setFindings(response.findings)
        setRun(response.run)
        setFindingsCaseId(caseId)
      }
    } catch (failure) {
      if (caseRef.current === caseId && generationRef.current === generation)
        setError(failure instanceof Error ? failure.message : 'Potential issue review failed.')
    } finally {
      if (caseRef.current === caseId && generationRef.current === generation) setLoading(false)
    }
  }
  const disposition = async (
    findingCaseId: string,
    findingId: string,
    value: IssueDispositionValue
  ) => {
    if (findingCaseId !== currentCase.case_id) return
    const caseGeneration = generationRef.current
    const generations = dispositionGenerationsRef.current
    const generation = (generations.get(findingId) ?? 0) + 1
    generations.set(findingId, generation)
    try {
      const saved = await justiceApi.setIssueDisposition(findingCaseId, findingId, value)
      if (
        caseRef.current === findingCaseId &&
        generationRef.current === caseGeneration &&
        generations.get(findingId) === generation
      )
        setFindings((items) =>
          items.map((item) =>
            item.case_id === findingCaseId && item.finding_id === findingId
              ? {
                  ...item,
                  latest_disposition: saved.value,
                  dispositions: [...item.dispositions, saved],
                }
              : item
          )
        )
    } catch (failure) {
      if (
        caseRef.current === findingCaseId &&
        generationRef.current === caseGeneration &&
        generations.get(findingId) === generation
      )
        setError(failure instanceof Error ? failure.message : 'Unable to save review choice.')
    }
  }

  return (
    <section className="bg-slate-950 p-5 text-white" aria-labelledby="potential-issues-heading">
      <h1 id="potential-issues-heading" className="text-xl font-semibold">
        Potential Issues
      </h1>
      <p className="mt-1 text-sm text-gray-400">
        Local, source-cited candidates for your review—not conclusions about what anyone did.
      </p>
      <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-950/30 p-4">
        <h2 className="font-semibold">Preflight</h2>
        <dl className="mt-3 grid gap-2 text-sm md:grid-cols-3">
          <Meta label="Jurisdiction" value={currentCase.jurisdiction} />
          <Meta
            label="Legal pack"
            value={pack ? `${pack.pack_id} · ${pack.version}` : 'No compatible pack'}
          />
          <Meta label="Law as of" value={pack?.as_of ?? 'Unknown'} />
          <Meta
            label="Ready evidence"
            value={String(mode === 'selected' ? selected.length : visibleEvidence.length)}
          />
          <Meta label="Processing" value="Local only" />
          <Meta label="Device transfer" value="Zero data leaves this device" />
        </dl>
        <p className="mt-3 text-sm font-semibold">
          Source pack approval: {pack?.approval_status ?? 'unknown'}. Candidate-screening approval
          is reported separately after a run. Not legal advice; verify current law, applicability,
          filing rules, and deadlines.
        </p>
      </div>
      {loading && (
        <p role="status" className="mt-4">
          Preparing local review…
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 rounded border border-red-500/40 p-3 text-red-300">
          {error}
        </p>
      )}
      <fieldset className="mt-4">
        <legend className="font-semibold">Evidence scope</legend>
        <label className="mr-4">
          <input type="radio" checked={mode === 'all'} onChange={() => setMode('all')} /> All ready
          evidence
        </label>
        <label>
          <input type="radio" checked={mode === 'selected'} onChange={() => setMode('selected')} />{' '}
          Selected evidence
        </label>
        {mode === 'selected' && (
          <div className="mt-2 grid gap-2">
            {visibleEvidence.map((record) => (
              <label key={record.evidence_id} className="rounded border border-white/10 p-2">
                <input
                  type="checkbox"
                  checked={selected.includes(record.evidence_id)}
                  onChange={(event) =>
                    setSelected((ids) =>
                      event.target.checked
                        ? [...ids, record.evidence_id]
                        : ids.filter((id) => id !== record.evidence_id)
                    )
                  }
                />{' '}
                <span className="ml-2">{record.original_filename}</span>
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <button
        onClick={() => void analyze()}
        disabled={
          loading ||
          !pack ||
          visibleEvidence.length === 0 ||
          (mode === 'selected' && selected.length === 0)
        }
        className="mt-4 min-h-11 rounded bg-neon-mint px-5 font-semibold text-slate-950 disabled:opacity-50"
      >
        Review potential issues locally
      </button>
      {visibleRun && <RunAudit run={visibleRun} />}{' '}
      {!loading && visibleFindings.length === 0 && (
        <p className="mt-4 text-sm text-gray-400">
          No issue candidates are displayed until you run the local review.
        </p>
      )}
      <div className="mt-5 space-y-5">
        {visibleFindings.map((finding) => (
          <FindingCard
            key={finding.finding_id}
            finding={finding}
            caseId={finding.case_id}
            onDisposition={(value) => void disposition(finding.case_id, finding.finding_id, value)}
          />
        ))}
      </div>
    </section>
  )
}

function FindingCard({
  finding,
  caseId,
  onDisposition,
}: {
  finding: IssueFindingDetail
  caseId: string
  onDisposition: (value: IssueDispositionValue) => void
}) {
  return (
    <article className="rounded-lg border border-white/10 bg-slate-900 p-5">
      <div className="flex flex-wrap justify-between gap-2">
        <h2 className="font-semibold">{finding.title}</h2>
        <span className="rounded-full border border-white/20 px-2 py-1 text-xs">
          {labelText(finding.label)}
        </span>
      </div>
      <p className="mt-3 text-sm">Why related: {finding.rationale}</p>
      <p className="mt-2 text-sm text-gray-300">
        Confidence:{' '}
        {finding.confidence === 'moderate'
          ? 'Multiple relevant terms or citations were found, but legal applicability still needs review.'
          : 'Limited relevant material was found; treat this as a question to investigate.'}
      </p>
      <CitationGroup
        title="Supporting evidence"
        citations={finding.support_citations}
        caseId={caseId}
      />
      <CitationGroup
        title="Contrary evidence"
        citations={finding.contrary_citations}
        caseId={caseId}
      />
      <CitationGroup title="Legal source" citations={finding.legal_citations} caseId={caseId} />
      <h3 className="mt-4 font-semibold">Element matrix</h3>
      {finding.element_matrix.map((row) => (
        <div key={`${row.element_id}-${row.condition_key}`} className="mt-2 rounded border border-white/10 p-3 text-sm">
          <p className="font-medium">{row.condition_text}</p>
          <p>{row.authority_quote}</p>
          <p className="mt-1 text-gray-400">
            {row.legal_locator} · Missing condition
          </p>
          <p className="mt-1">
            Support: {row.support_citation_ids.length} · Contrary:{' '}
            {row.contrary_citation_ids.length} · Missing: {row.missing_fact_ids.length}
          </p>
        </div>
      ))}
      {finding.missing_facts.length > 0 && (
        <List title="Missing facts" items={finding.missing_facts.map((item) => item.description)} />
      )}{' '}
      {finding.qualifications.length > 0 && (
        <List
          title="Qualifications"
          items={finding.qualifications.map((item) => item.description)}
        />
      )}
      <List
        title="Safe next steps"
        items={[
          ...finding.safe_next_steps,
          'Preserve cited originals and draft questions for review before sending anything.',
        ]}
      />
      {finding.warnings.map((warning) => (
        <p key={warning} className="mt-2 text-sm font-semibold text-amber-200">
          <AlertTriangle className="mr-1 inline h-4 w-4" />
          {warning}
        </p>
      ))}
      <p className="mt-3 text-sm font-semibold">
        Not legal advice. Verify current law, applicability, and deadlines.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="py-2 text-sm">Your review:</span>
        {(['accepted', 'dismissed', 'needs_review'] as const).map((value) => (
          <button
            key={value}
            onClick={() => onDisposition(value)}
            aria-pressed={finding.latest_disposition === value}
            className="min-h-11 rounded border border-white/20 px-3 aria-pressed:border-neon-mint aria-pressed:text-neon-mint"
          >
            {value.replace('_', ' ')}
          </button>
        ))}
      </div>
    </article>
  )
}
function CitationGroup({
  title,
  citations,
  caseId,
}: {
  title: string
  citations: IssueCitation[]
  caseId: string
}) {
  if (!citations.length) return null
  return (
    <section className="mt-4">
      <h3 className="font-semibold">{title}</h3>
      {citations.map((citation) => (
        <div key={citation.citation_id} className="mt-2 rounded border border-white/10 p-3 text-sm">
          <blockquote className="border-l-2 border-neon-mint pl-3">“{citation.quote}”</blockquote>
          <p className="mt-2 text-xs text-gray-400">
            {citation.original_filename ?? citation.authority_title} · {locator(citation)} · SHA-256{' '}
            {citation.text_sha256}
          </p>
          {citation.evidence_id && (
            <p className="mt-1 text-xs text-gray-400">
              Evidence {citation.evidence_id} · {citation.provenance ?? 'Provenance unavailable'} ·
              imported {citation.imported_at ?? 'unknown'}
            </p>
          )}
          {citation.source_id && (
            <p className="mt-1 text-xs text-gray-400">
              Citation {citation.locator} · as of {citation.as_of ?? 'unknown'} ·{' '}
              {citation.source_status ?? 'status unknown'} ·{' '}
              {citation.approval_status ?? 'approval unknown'}
            </p>
          )}
          {citation.evidence_id && (
            <button
              onClick={() => void download(caseId, citation)}
              className="mt-2 inline-flex min-h-11 items-center gap-2 rounded border border-white/20 px-3"
            >
              <Download className="h-4 w-4" /> Download original
            </button>
          )}
          {citation.canonical_url && (
            <a
              href={citation.canonical_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex min-h-11 items-center gap-2 rounded border border-white/20 px-3"
            >
              <ExternalLink className="h-4 w-4" /> Official source
            </a>
          )}
        </div>
      ))}
    </section>
  )
}
async function download(caseId: string, citation: IssueCitation) {
  if (!citation.evidence_id) return
  const blob = await justiceApi.downloadEvidenceOriginal(caseId, citation.evidence_id)
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = citation.original_filename ?? 'evidence'
  anchor.click()
  URL.revokeObjectURL(url)
}
const locator = (citation: IssueCitation) =>
  citation.page_number !== null
    ? `Page ${citation.page_number}`
    : citation.paragraph_index !== null
      ? `Paragraph ${citation.paragraph_index}`
      : citation.locator ?? `Characters ${citation.char_start}–${citation.char_end}`
const labelText = (label: string) =>
  ({
    possible: 'Potential issue for review',
    conflicting: 'Conflicting evidence for review',
    missing_facts: 'Potential issue—more facts needed',
    not_supported: 'Not supported by reviewed evidence',
  })[label] ?? label
function RunAudit({ run }: { run: IssueRun }) {
  return (
    <section
      className="mt-4 rounded border border-white/10 p-4"
      aria-label="Candidate screening audit"
    >
      <h2 className="font-semibold">Candidate screening audit</h2>
      <dl className="mt-2 grid gap-2 text-sm md:grid-cols-3">
        <Meta label="Run" value={run.run_id} />
        <Meta label="Engine" value={run.engine_id} />
        <Meta label="Ruleset" value={run.ruleset_id} />
        <Meta label="Ruleset SHA-256" value={run.ruleset_sha256} />
        <Meta label="Input SHA-256" value={run.input_sha256} />
        <Meta label="Run status" value={run.status} />
        <Meta label="Candidate screening" value={run.screening_status} />
        <Meta label="Source pack status" value={run.pack_status} />
        <Meta label="Source matching approval" value={run.approval_status} />
        <Meta label="Created" value={run.created_at} />
        <Meta label="Completed" value={run.completed_at ?? 'Not completed'} />
        <Meta label="Input manifest" value={JSON.stringify(run.input_manifest)} />
      </dl>
    </section>
  )
}
function newestCompatiblePack(packs: LegalPack[]) {
  return packs
    .filter(
      (pack) =>
        pack.jurisdiction === 'South Carolina' && pack.matter_type === 'residential landlord-tenant'
    )
    .sort(
      (a, b) =>
        b.version.localeCompare(a.version, undefined, { numeric: true }) ||
        b.as_of.localeCompare(a.as_of, undefined, { numeric: true }) ||
        b.retrieved_at.localeCompare(a.retrieved_at)
    )[0]
}
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase text-gray-500">{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}
function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4">
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-1 list-disc pl-5 text-sm">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
