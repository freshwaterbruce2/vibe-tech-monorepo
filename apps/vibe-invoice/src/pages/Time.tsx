import { Plus, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import Navigation from '../components/common/Navigation'
import Timer from '../components/time/Timer'
import { formatCurrency } from '../lib/currency'
import {
  timeService,
  type Project,
  type TimeEntry,
} from '../services/timeService'

const formatDuration = (seconds: number | null): string => {
  if (seconds === null || seconds === undefined) return '—'
  const hours = seconds / 3600
  return `${hours.toFixed(2)}h`
}

const Time = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectRate, setProjectRate] = useState('0')

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const [p, e] = await Promise.all([
        timeService.listProjects(),
        timeService.listEntries(),
      ])
      setProjects(p)
      setEntries(e)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const onCreateProject = async () => {
    const name = projectName.trim()
    if (!name) return
    const rate = Number(projectRate)
    try {
      await timeService.createProject({
        name,
        hourlyRate: Number.isFinite(rate) && rate > 0 ? rate : null,
      })
      toast.success('Project created')
      setProjectName('')
      setProjectRate('0')
      setShowProjectForm(false)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create')
    }
  }

  const onDeleteEntry = async (e: TimeEntry) => {
    if (!confirm('Delete entry?')) return
    try {
      await timeService.deleteEntry(e.id)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div className="ui-page">
      <Navigation variant="app" />
      <main className="ui-container">
        <div className="ui-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 className="ui-h1">Time tracking</h1>
          <button
            type="button"
            className="ui-button ui-button--ghost"
            onClick={() => setShowProjectForm(true)}
          >
            <Plus size={16} /> New project
          </button>
        </div>

        <Timer projects={projects} onChange={() => void load()} />

        {showProjectForm ? (
          <div className="ui-card" style={{ marginTop: 16, padding: 16 }}>
            <h3 className="ui-h3">New project</h3>
            <div className="ui-stack ui-stack--sm">
              <input
                className="ui-input"
                placeholder="Project name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
              <input
                className="ui-input"
                type="number"
                step="0.01"
                min={0}
                placeholder="Hourly rate"
                value={projectRate}
                onChange={(e) => setProjectRate(e.target.value)}
              />
              <div className="ui-row" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="ui-button"
                  onClick={() => void onCreateProject()}
                >
                  Create
                </button>
                <button
                  type="button"
                  className="ui-button ui-button--ghost"
                  onClick={() => setShowProjectForm(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <h2 className="ui-h2" style={{ marginTop: 24 }}>Recent entries</h2>
        {loading ? (
          <div className="ui-muted">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="ui-muted">No entries yet.</div>
        ) : (
          <table className="ui-table">
            <thead>
              <tr>
                <th>Started</th>
                <th>Project</th>
                <th>Description</th>
                <th>Duration</th>
                <th>Rate</th>
                <th>Invoiced</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => {
                const project = projects.find((p) => p.id === e.projectId)
                return (
                  <tr key={e.id}>
                    <td>{new Date(e.startedAt).toLocaleString()}</td>
                    <td>{project?.name ?? '—'}</td>
                    <td>{e.description ?? ''}</td>
                    <td>{formatDuration(e.durationSeconds)}</td>
                    <td>
                      {e.hourlyRate !== null
                        ? formatCurrency(e.hourlyRate, project?.currency ?? 'USD')
                        : '—'}
                    </td>
                    <td>{e.invoicedOnInvoiceId ?? ''}</td>
                    <td className="ui-row" style={{ justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="ui-button ui-button--ghost"
                        onClick={() => void onDeleteEntry(e)}
                        disabled={Boolean(e.invoicedOnInvoiceId)}
                        aria-label="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </main>
    </div>
  )
}

export default Time
