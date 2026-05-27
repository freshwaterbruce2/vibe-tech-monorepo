import { Pause, Play } from 'lucide-react'
import { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { timeService, type Project, type TimeEntry } from '../../services/timeService'

interface TimerProps {
  projects: Project[]
  onChange?: () => void
}

const formatHms = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const Timer = ({ projects, onChange }: TimerProps) => {
  const [running, setRunning] = useState<TimeEntry | null>(null)
  const [projectId, setProjectId] = useState('')
  const [description, setDescription] = useState('')
  const [now, setNow] = useState(Date.now())
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void timeService.getRunning().then(setRunning).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [running])

  const elapsedSeconds = running
    ? Math.floor((now - new Date(running.startedAt).getTime()) / 1000)
    : 0

  const onStart = async () => {
    setBusy(true)
    try {
      const entry = await timeService.start({
        projectId: projectId || undefined,
        description: description || undefined,
      })
      setRunning(entry)
      setNow(Date.now())
      onChange?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start')
    } finally {
      setBusy(false)
    }
  }

  const onStop = async () => {
    if (!running) return
    setBusy(true)
    try {
      await timeService.stop(running.id)
      setRunning(null)
      setDescription('')
      onChange?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to stop')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ui-card" style={{ padding: 16 }}>
      <div className="ui-row" style={{ alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: 32, fontFamily: 'monospace', minWidth: 130 }}>
          {formatHms(elapsedSeconds)}
        </div>
        {running ? (
          <button
            type="button"
            className="ui-button"
            onClick={() => void onStop()}
            disabled={busy}
            aria-label="Stop timer"
          >
            <Pause size={16} /> Stop
          </button>
        ) : (
          <button
            type="button"
            className="ui-button"
            onClick={() => void onStart()}
            disabled={busy}
            aria-label="Start timer"
          >
            <Play size={16} /> Start
          </button>
        )}
      </div>

      {!running ? (
        <div className="ui-stack ui-stack--sm" style={{ marginTop: 12 }}>
          <select
            className="ui-input"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
          >
            <option value="">(no project)</option>
            {projects
              .filter((p) => p.status === 'active')
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
          <input
            className="ui-input"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
      ) : (
        <div className="ui-muted" style={{ marginTop: 12 }}>
          {running.description || '(no description)'}
        </div>
      )}
    </div>
  )
}

export default Timer
