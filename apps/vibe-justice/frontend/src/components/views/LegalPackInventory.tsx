import { AlertTriangle, BookMarked, ExternalLink, FileText, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { justiceApi, type LegalPackSourceDetail, type LegalPack } from '../../services/api'

export function LegalPackInventory() {
  const [packs, setPacks] = useState<LegalPack[]>([])
  const [selectedSource, setSelectedSource] = useState<LegalPackSourceDetail | null>(null)
  const [sourceLoading, setSourceLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const generationRef = useRef(0)
  const sourceGenerationRef = useRef(0)

  const load = useCallback(async () => {
    const generation = ++generationRef.current
    sourceGenerationRef.current += 1
    setSelectedSource(null); setSourceLoading(false)
    setLoading(true); setError('')
    try {
      const response = await justiceApi.listLegalPacks()
      if (generationRef.current !== generation) return
      setPacks(response.packs)
      setSelectedSource((selected) => selected && response.packs.some((pack) => pack.pack_id === selected.pack_id && pack.sources.some((source) => source.source_id === selected.source_id)) ? selected : null)
    } catch (failure) {
      if (generationRef.current !== generation) return
      setError(failure instanceof Error ? failure.message : 'Unable to load installed legal packs.')
    } finally {
      if (generationRef.current === generation) setLoading(false)
    }
  }, [])

  useEffect(() => { void load(); return () => { generationRef.current += 1 } }, [load])

  const openSource = async (packId: string, sourceId: string) => {
    const generation = ++sourceGenerationRef.current
    setSourceLoading(true); setError('')
    try {
      const detail = await justiceApi.getLegalPackSource(packId, sourceId)
      if (sourceGenerationRef.current !== generation) return
      setSelectedSource(detail)
    } catch (failure) {
      if (sourceGenerationRef.current !== generation) return
      setError(failure instanceof Error ? failure.message : 'Unable to load source detail.')
    } finally {
      if (sourceGenerationRef.current === generation) setSourceLoading(false)
    }
  }

  return <section className="border-b border-slate-800 p-4" aria-labelledby="legal-packs-heading">
    <div className="rounded-lg border border-amber-500/50 bg-amber-950/30 p-4 text-amber-100" role="note">
      <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><h2 className="font-semibold">Research source limitation</h2><p className="mt-1 text-sm">The South Carolina web Code is current through the 2025 Session, but it is an unofficial research source. The printed published volumes and pertinent acts are the official law.</p><p className="mt-2 text-sm font-semibold">Not legal advice. Verify current law, effective dates, filing rules, and every deadline before acting.</p></div></div>
    </div>
    <div className="mt-5 flex items-start justify-between gap-4"><div><h2 id="legal-packs-heading" className="flex items-center gap-2 text-lg font-semibold"><BookMarked className="h-5 w-5 text-neon-mint" /> Installed legal source packs</h2><p className="mt-1 text-sm text-gray-400">Reviewed source inventory only. Evidence matching and legal conclusions are not enabled here.</p></div><button onClick={() => void load()} className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/20 px-4 py-2"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh packs</button></div>
    {loading && <p role="status" className="mt-4 text-sm text-gray-400">Loading installed legal packs…</p>}
    {error && <p role="alert" className="mt-4 rounded-md border border-red-500/40 bg-red-950/30 p-3 text-sm text-red-200">{error}</p>}
    {!loading && !error && packs.length === 0 && <p className="mt-4 rounded-md border border-dashed border-white/20 p-4 text-sm">No installed legal packs were reported. This does not mean no law applies.</p>}
    <div className="mt-4 grid gap-4 xl:grid-cols-2">{packs.map((pack) => <article key={pack.pack_id} className="rounded-lg border border-white/10 bg-slate-900/70 p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="font-semibold">{pack.jurisdiction} · {pack.matter_type}</h3><p className="mt-1 font-mono text-xs text-gray-400">{pack.pack_id}</p></div><span className="rounded-full border border-white/20 px-2 py-1 text-xs">{pack.status}</span></div><dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><Meta label="Version" value={pack.version} /><Meta label="As of" value={pack.as_of} /><Meta label="Retrieval" value={pack.retrieval_status} /><Meta label="Approval" value={pack.approval_status} /><Meta label="Retrieved" value={pack.retrieved_at} /><Meta label="Pack SHA-256" value={abbreviate(pack.sha256)} title={pack.sha256} /></dl><h4 className="mt-4 text-sm font-semibold">Official source inventory</h4><div className="mt-2 space-y-2">{pack.sources.map((source) => <button key={source.source_id} onClick={() => void openSource(pack.pack_id, source.source_id)} className="flex min-h-11 w-full items-center gap-3 rounded-md border border-white/10 bg-slate-950/60 p-3 text-left hover:border-neon-mint/50"><FileText className="h-4 w-4 shrink-0 text-neon-mint" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{source.title}</span><span className="block text-xs text-gray-400">{source.official ? 'Official publisher' : 'Secondary source'} · {source.status}</span></span></button>)}</div></article>)}</div>
    {sourceLoading && <p role="status" className="mt-4 text-sm text-gray-400">Loading exact source detail…</p>}
    {selectedSource && <section className="mt-4 rounded-lg border border-neon-mint/30 bg-slate-900 p-5" aria-labelledby="source-detail-heading"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 id="source-detail-heading" className="font-semibold">{selectedSource.title}</h3><p className="mt-1 text-xs text-gray-400">{selectedSource.locator}</p></div><a href={selectedSource.canonical_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/20 px-3 py-2 text-sm"><ExternalLink className="h-4 w-4" /> Open canonical official source</a></div><blockquote className="mt-4 whitespace-pre-wrap border-l-2 border-neon-mint pl-4 text-sm text-gray-200">{selectedSource.excerpt}</blockquote><dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3"><Meta label="Source ID" value={selectedSource.source_id} /><Meta label="Source status" value={selectedSource.status} /><Meta label="Pack status" value={selectedSource.pack_status} /><Meta label="Approval" value={selectedSource.approval_status} /><Meta label="Version" value={selectedSource.version} /><Meta label="As of" value={selectedSource.as_of} /><Meta label="Retrieved" value={selectedSource.retrieved_at} /><Meta label="Source SHA-256" value={abbreviate(selectedSource.sha256)} title={selectedSource.sha256} /></dl>{selectedSource.elements.length > 0 && <div className="mt-4"><h4 className="text-sm font-semibold">Source-checked authority structure</h4><p className="mt-1 text-xs text-amber-200">Inventory detail only; these elements are not approved for evidence matching.</p><ol className="mt-2 space-y-2">{selectedSource.elements.map((element) => <li key={element.element_id} className="rounded border border-white/10 p-3 text-sm"><p>{element.authority_text}</p><p className="mt-1 text-xs text-gray-400">{element.applicability} · {element.status}</p></li>)}</ol></div>}</section>}
  </section>
}

function Meta({ label, value, title }: { label: string; value: string; title?: string }) { return <div><dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt><dd className="break-words" title={title}>{value}</dd></div> }
const abbreviate = (value: string) => value.length > 24 ? `${value.slice(0, 12)}…${value.slice(-8)}` : value
