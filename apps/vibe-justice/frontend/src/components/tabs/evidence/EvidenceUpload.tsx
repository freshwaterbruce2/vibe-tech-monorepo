import * as Dialog from '@radix-ui/react-dialog'
import { FileUp, X } from 'lucide-react'
import { useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from 'react'
import { justiceApi, type EvidenceRecord } from '../../../services/api'

const ACCEPTED_EXTENSIONS = '.pdf,.docx,.txt,.png,.jpg,.jpeg,.tif,.tiff'

interface EvidenceUploadProps {
  caseId: string
  onUploadComplete: (record: EvidenceRecord) => void
}

export function EvidenceUpload({ caseId, onUploadComplete }: EvidenceUploadProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [sourceLabel, setSourceLabel] = useState('')
  const [receivedFrom, setReceivedFrom] = useState('')
  const [notes, setNotes] = useState('')
  const [evidenceDate, setEvidenceDate] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = () => {
    setFile(null); setSourceLabel(''); setReceivedFrom(''); setNotes(''); setEvidenceDate(''); setError('')
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!file || !sourceLabel.trim()) return setError('Choose a file and enter a source label.')
    setIsUploading(true); setError('')
    try {
      const record = await justiceApi.uploadEvidence(file, caseId, {
        sourceLabel: sourceLabel.trim(),
        receivedFrom: receivedFrom.trim() || undefined,
        notes: notes.trim() || undefined,
        evidenceDate: evidenceDate || undefined,
      })
      onUploadComplete(record); reset(); setOpen(false)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Evidence import failed.')
    } finally {
      setIsUploading(false)
    }
  }

  const selectFile = (selected?: File) => {
    if (selected) { setFile(selected); setError('') }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => { if (!isUploading) { setOpen(next); if (!next) reset() } }}>
      <Dialog.Trigger asChild>
        <button className="inline-flex min-h-11 items-center gap-2 rounded-md bg-neon-mint px-4 py-2 font-semibold text-slate-950 hover:bg-neon-mint/90">
          <FileUp className="h-4 w-4" /> Import evidence
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/70" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[101] max-h-[90vh] w-[min(92vw,36rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-white/15 bg-slate-950 p-6 text-white shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-xl font-semibold">Import evidence</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-gray-400">Store an immutable original in the current case. Import does not analyze, index, or cite it.</Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close import dialog" className="rounded p-2 text-gray-400 hover:bg-white/10"><X className="h-4 w-4" /></Dialog.Close>
          </div>
          <form className="mt-5 space-y-4" onSubmit={submit}>
            <div className="rounded-lg border border-dashed border-white/25 bg-white/5 p-6 text-center" onDragOver={(event: DragEvent) => event.preventDefault()} onDrop={(event: DragEvent) => { event.preventDefault(); selectFile(event.dataTransfer.files[0]) }}>
              <input ref={inputRef} className="sr-only" type="file" accept={ACCEPTED_EXTENSIONS} onChange={(event: ChangeEvent<HTMLInputElement>) => selectFile(event.target.files?.[0])} />
              <p className="text-sm font-medium">{file ? file.name : 'Drop one file here or use the file picker'}</p>
              {file && <p className="mt-1 text-xs text-gray-400">{formatBytes(file.size)}</p>}
              <button type="button" className="mt-3 min-h-11 rounded-md border border-white/20 px-4 py-2 hover:bg-white/10" onClick={() => inputRef.current?.click()}>Choose file</button>
              <p className="mt-3 text-xs text-gray-400">PDF, DOCX, TXT, PNG, JPEG, or TIFF. 25 MB maximum.</p>
            </div>
            <label className="block text-sm font-medium">Source label *<input className="mt-1 min-h-11 w-full rounded-md border border-white/20 bg-slate-900 px-3" value={sourceLabel} onChange={(event) => setSourceLabel(event.target.value)} required maxLength={120} placeholder="Example: Email attachment" /></label>
            <label className="block text-sm font-medium">Received from or source description<input className="mt-1 min-h-11 w-full rounded-md border border-white/20 bg-slate-900 px-3" value={receivedFrom} onChange={(event) => setReceivedFrom(event.target.value)} maxLength={240} /></label>
            <label className="block text-sm font-medium">Evidence date<input className="mt-1 min-h-11 w-full rounded-md border border-white/20 bg-slate-900 px-3" type="date" value={evidenceDate} onChange={(event) => setEvidenceDate(event.target.value)} /></label>
            <label className="block text-sm font-medium">Notes<textarea className="mt-1 min-h-24 w-full rounded-md border border-white/20 bg-slate-900 px-3 py-2" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} /></label>
            {error && <p role="alert" className="rounded-md border border-red-500/30 bg-red-950/40 p-3 text-sm text-red-300">{error}</p>}
            {isUploading && <p role="status" className="text-sm text-neon-mint">Importing and validating the original…</p>}
            <div className="flex justify-end gap-3">
              <Dialog.Close asChild><button type="button" disabled={isUploading} className="min-h-11 rounded-md border border-white/20 px-4 py-2 disabled:opacity-50">Cancel</button></Dialog.Close>
              <button type="submit" disabled={isUploading || !file || !sourceLabel.trim()} className="min-h-11 rounded-md bg-neon-mint px-4 py-2 font-semibold text-slate-950 disabled:opacity-50">{isUploading ? 'Importing…' : 'Import original'}</button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
