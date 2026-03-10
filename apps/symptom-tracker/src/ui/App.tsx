import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import type { Person, SymptomEntry, SymptomSummaryRow } from '../api/client'
import {
  createEntry,
  createPerson,
  deleteEntry,
  getPeople,
  getSummary,
  healthCheck,
  listEntries,
  updateEntry,
} from '../api/client'
import {
  todayIso,
  severityClass,
  safeTagsToStrings,
  validateForm,
  prepareEntryPayload,
  getDefaultFilters,
  getDefaultFormState,
} from './utils'
import {
  exportSymptomDataCSV,
  exportSymptomDataJSON,
} from './exportUtils'

interface Filters {
  from: string
  to: string
  q: string
}

export function App(): React.JSX.Element {
  const [apiUp, setApiUp] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [peopleLoaded, setPeopleLoaded] = useState(false)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    // eslint-disable-next-line electron-security/no-localstorage-electron -- web-only PWA, not an Electron app
    const saved = localStorage.getItem('symptom-tracker-dark-mode')
    return saved === 'true'
  })

  const [people, setPeople] = useState<Person[]>([])
  const [selectedPersonId, setSelectedPersonId] = useState<string>('')

  const [filters, setFilters] = useState<Filters>(getDefaultFilters())
  const [searchInput, setSearchInput] = useState('')  // Local state for immediate UI update
  const [entries, setEntries] = useState<SymptomEntry[]>([])
  const [summary, setSummary] = useState<SymptomSummaryRow[]>([])

  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(getDefaultFormState())

  const selectedPerson = useMemo(
    () => people.find((p) => p.id === selectedPersonId) ?? null,
    [people, selectedPersonId],
  )

  // Memoized statistics for performance (2026 optimization)
  const stats = useMemo(() => {
    if (entries.length === 0) return null
    
    const totalSeverity = entries.reduce((sum, e) => sum + e.severity, 0)
    const avgSeverity = totalSeverity / entries.length
    const maxSeverity = Math.max(...entries.map(e => e.severity))
    const uniqueSymptoms = new Set(entries.map(e => e.symptom)).size
    
    return {
      count: entries.length,
      avgSeverity: avgSeverity.toFixed(1),
      maxSeverity,
      uniqueSymptoms
    }
  }, [entries])

  // Debounced search to reduce API calls (2026 optimization)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debouncedSetSearch = useCallback((value: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      setFilters((f) => ({ ...f, q: value }))
    }, 500) // 500ms debounce
  }, [])

  const refreshPeople = useCallback(async (): Promise<void> => {
    const list = await getPeople()
    setPeople(list)
    if (!selectedPersonId && list[0]?.id) setSelectedPersonId(list[0].id)
  }, [selectedPersonId])

  const refreshEntriesAndSummary = useCallback(
    async (personId: string, nextFilters: Filters): Promise<void> => {
      const [nextEntries, nextSummary] = await Promise.all([
        listEntries({ personId, ...nextFilters }),
        getSummary({ personId, ...nextFilters }),
      ])
      setEntries(nextEntries)
      setSummary(nextSummary)
    },
    [],
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const ok = await healthCheck()
        if (!cancelled) setApiUp(ok)
      } catch {
        if (!cancelled) setApiUp(false)
      }
    })()
    const id = window.setInterval(() => {
      void (async () => {
        const ok = await healthCheck()
        if (!cancelled) setApiUp(ok)
      })()
    }, 5000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  // Dark mode effect (2026 enhancement)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    // eslint-disable-next-line electron-security/no-localstorage-electron -- web-only PWA, not an Electron app
    localStorage.setItem('symptom-tracker-dark-mode', darkMode.toString())
  }, [darkMode])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        setError(null)
        await refreshPeople()
        if (!cancelled) setPeopleLoaded(true)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
        if (!cancelled) setPeopleLoaded(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [refreshPeople])

  useEffect(() => {
    if (!selectedPersonId) return
    let cancelled = false
    void (async () => {
      try {
        setError(null)
        await refreshEntriesAndSummary(selectedPersonId, filters)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [filters, refreshEntriesAndSummary, selectedPersonId])

  async function handleCreateDefaultPeople(): Promise<void> {
    setError(null)
    try {
      const meName = 'Me'
      const spouseName = 'Wife'
      const created1 = await createPerson(meName)
      const created2 = await createPerson(spouseName)
      setPeople([created1, created2])
      setSelectedPersonId(created1.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function handleAddOrUpdate(): Promise<void> {
    if (!selectedPersonId) return
    setError(null)

    const validation = validateForm(form, selectedPersonId)
    if (!validation.valid) {
      setError(validation.error ?? null)
      return
    }

    try {
      const payload = prepareEntryPayload(form, selectedPersonId)

      if (editingId) {
        await updateEntry(editingId, {
          date: payload.date,
          time: payload.time ?? undefined,
          symptom: payload.symptom,
          severity: payload.severity,
          notes: payload.notes ?? '',
          tags: payload.tags ?? [],
        })
        setEditingId(null)
      } else {
        await createEntry(payload)
      }

      setForm((f) => ({ ...f, symptom: '', notes: '' }))
      await refreshEntriesAndSummary(selectedPersonId, filters)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  function beginEdit(entry: SymptomEntry): void {
    setEditingId(entry.id)
    setForm({
      date: entry.date,
      time: entry.time ?? '',
      symptom: entry.symptom,
      severity: entry.severity,
      tagsText: safeTagsToStrings(entry.tags).join(', '),
      notes: entry.notes ?? '',
    })
  }

  function cancelEdit(): void {
    setEditingId(null)
    setForm((f) => ({ ...f, symptom: '', notes: '' }))
  }

  async function handleDelete(entryId: string): Promise<void> {
    if (!selectedPersonId) return
    setError(null)
    try {
      await deleteEntry(entryId)
      if (editingId === entryId) cancelEdit()
      await refreshEntriesAndSummary(selectedPersonId, filters)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const isSetup = apiUp === true && peopleLoaded && people.length === 0

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand">
          <h1>Symptom Tracker</h1>
          <p>Fast logging for you + your wife. Local DB, no account required.</p>
        </div>
        <button
          type="button"
          className="btn ghost"
          onClick={() => setDarkMode(prev => !prev)}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{ marginBottom: 8 }}
        >
          {darkMode ? '☀️' : '🌙'} {darkMode ? 'Light' : 'Dark'}
        </button>
        <div className="pillRow" role="group" aria-label="Person picker">
          {people.map((p) => (
            <button
              key={p.id}
              type="button"
              className="pill"
              aria-pressed={p.id === selectedPersonId}
              onClick={() => setSelectedPersonId(p.id)}
              title={`View entries for ${p.name}`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {apiUp === false ? (
        <div className="banner">
          API is not reachable. Start it with <span className="muted">pnpm --filter symptom-tracker-api dev</span>.
        </div>
      ) : null}

      {error ? <div className="banner">{error}</div> : null}

      {isSetup ? (
        <div className="card">
          <div className="cardHeader">
            <h2>First time setup</h2>
            <p>Create two profiles. You can rename later (not implemented yet).</p>
          </div>
          <div className="cardBody">
            <div className="split">
              <button type="button" className="btn primary" onClick={() => void handleCreateDefaultPeople()}>
                Create "Me" + "Wife"
              </button>
              <button type="button" className="btn ghost" onClick={() => void refreshPeople()}>
                Refresh
              </button>
            </div>
            <div className="hr" />
            <p className="tiny muted">
              Tip: keep the database on <strong>D:\</strong> so health data stays off the repo drive.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid">
          <div className="card">
            <div className="cardHeader">
              <h2>{editingId ? 'Edit entry' : 'New entry'}</h2>
              <p>
                Logging for <strong>{selectedPerson?.name ?? '—'}</strong>
              </p>
            </div>
            <div className="cardBody">
              <div className="row two">
                <div>
                  <label>Date</label>
                  <input
                    className="input"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    aria-label="Symptom date"
                  />
                </div>
                <div>
                  <label>Time (optional)</label>
                  <input
                    className="input"
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                    aria-label="Symptom time (optional)"
                  />
                </div>
              </div>

              <div className="row" style={{ marginTop: 10 }}>
                <div>
                  <label>Symptom</label>
                  <input
                    className="input"
                    placeholder="e.g., headache, nausea, dizziness"
                    value={form.symptom}
                    onChange={(e) => setForm((f) => ({ ...f, symptom: e.target.value }))}
                    aria-label="Symptom description"
                    required
                  />
                </div>

                <div>
                  <label>Severity: {form.severity}/10</label>
                  <input
                    className="input"
                    type="range"
                    min={0}
                    max={10}
                    step={1}
                    value={form.severity}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, severity: Number(e.target.value) }))
                    }
                    aria-label={`Symptom severity: ${form.severity} out of 10`}
                    aria-valuemin={0}
                    aria-valuemax={10}
                    aria-valuenow={form.severity}
                  />
                </div>

                <div>
                  <label>Tags (comma separated)</label>
                  <input
                    className="input"
                    placeholder="e.g., morning, after-meal, stress"
                    value={form.tagsText}
                    onChange={(e) => setForm((f) => ({ ...f, tagsText: e.target.value }))}
                    aria-label="Symptom tags, comma separated"
                  />
                </div>

                <div>
                  <label>Notes</label>
                  <textarea
                    className="textarea"
                    placeholder="Anything helpful (what you ate, meds, triggers, etc.)"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    aria-label="Additional notes about the symptom"
                  />
                </div>
              </div>

              <div className="actions">
                {editingId ? (
                  <button 
                    type="button" 
                    className="btn" 
                    onClick={cancelEdit}
                    aria-label="Cancel editing symptom entry"
                  >
                    Cancel
                  </button>
                ) : null}
                <button 
                  type="button" 
                  className="btn primary" 
                  onClick={() => void handleAddOrUpdate()}
                  aria-label={editingId ? 'Update symptom entry' : 'Add new symptom entry'}
                >
                  {editingId ? 'Update entry' : 'Add entry'}
                </button>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="cardHeader">
              <h2>Entries</h2>
              <p>Filter and review recent symptoms.</p>
            </div>
            <div className="cardBody">
              <div className="row two">
                <div>
                  <label>From</label>
                  <input
                    className="input"
                    type="date"
                    value={filters.from}
                    onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
                  />
                </div>
                <div>
                  <label>To</label>
                  <input
                    className="input"
                    type="date"
                    value={filters.to}
                    onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                  />
                </div>
              </div>

              <div className="row" style={{ marginTop: 10 }}>
                <div>
                  <label>Search</label>
                  <input
                    className="input"
                    placeholder="Search symptom or notes"
                    value={searchInput}
                    onChange={(e) => {
                      setSearchInput(e.target.value)
                      debouncedSetSearch(e.target.value)
                    }}
                    aria-label="Search symptoms and notes"
                  />
                </div>
                <div className="split">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      const to = todayIso()
                      const from = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)
                        .toISOString()
                        .slice(0, 10)
                      setSearchInput('')
                      setFilters({ from, to, q: '' })
                    }}
                  >
                    Last 7 days
                  </button>
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      const to = todayIso()
                      const from = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
                        .toISOString()
                        .slice(0, 10)
                      setSearchInput('')
                      setFilters({ from, to, q: '' })
                    }}
                  >
                    Last 30 days
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => setFilters(getDefaultFilters())}
                  >
                    Clear
                  </button>
                </div>
                <div className="split" style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => exportSymptomDataCSV(entries, people)}
                    title="Export data as CSV for spreadsheet analysis"
                    aria-label="Export symptom data as CSV"
                  >
                    📊 Export CSV
                  </button>
                  <button
                    type="button"
                    className="btn ghost"
                    onClick={() => exportSymptomDataJSON(entries, people)}
                    title="Export data as JSON for backup and re-import"
                    aria-label="Export symptom data as JSON"
                  >
                    💾 Export JSON
                  </button>
                </div>
              </div>

              <div className="hr" />

              {stats && (
                <>
                  <div className="tiny muted" style={{ marginBottom: 10 }}>
                    Statistics for this range
                  </div>
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                    gap: 12,
                    marginBottom: 14 
                  }}>
                    <div className="stat-box">
                      <div className="stat-value">{stats.count}</div>
                      <div className="tiny muted">Total Entries</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-value">{stats.avgSeverity}</div>
                      <div className="tiny muted">Avg Severity</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-value">{stats.maxSeverity}/10</div>
                      <div className="tiny muted">Max Severity</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-value">{stats.uniqueSymptoms}</div>
                      <div className="tiny muted">Unique Symptoms</div>
                    </div>
                  </div>
                  <div className="hr" />
                </>
              )}

              {summary.length ? (
                <>
                  <div className="tiny muted" style={{ marginBottom: 10 }}>
                    Top symptoms in this range
                  </div>
                  <div className="list" style={{ marginBottom: 14 }}>
                    {summary.slice(0, 6).map((s) => (
                      <div key={s.symptom} className="entry">
                        <div className="entryTop">
                          <div className="entryTitle">
                            <strong>{s.symptom}</strong>
                            <span className="tag">{s.count} entries</span>
                          </div>
                          <span className={`severity ${severityClass(s.avgSeverity)}`}>
                            avg {s.avgSeverity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              <div className="list">
                {entries.length ? (
                  entries.map((entry) => {
                    const tags = safeTagsToStrings(entry.tags)
                    return (
                      <div key={entry.id} className="entry">
                        <div className="entryTop">
                          <div>
                            <div className="entryTitle">
                              <strong>{entry.symptom}</strong>
                              <span className="tag">
                                {entry.date}
                                {entry.time ? ` • ${entry.time}` : ''}
                              </span>
                              {tags.map((t) => (
                                <span key={t} className="tag">
                                  {t}
                                </span>
                              ))}
                            </div>
                            {entry.notes ? (
                              <div className="tiny muted" style={{ marginTop: 6 }}>
                                {entry.notes}
                              </div>
                            ) : null}
                          </div>
                          <div style={{ display: 'grid', gap: 8, justifyItems: 'end' }}>
                            <span className={`severity ${severityClass(entry.severity)}`}>
                              {entry.severity}/10
                            </span>
                            <div className="split">
                              <button type="button" className="btn" onClick={() => beginEdit(entry)}>
                                Edit
                              </button>
                              <button
                                type="button"
                                className="btn danger"
                                onClick={() => void handleDelete(entry.id)}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="tiny muted">No entries yet.</div>
                )}
              </div>

              {apiUp === null ? (
                <div className="tiny muted" style={{ marginTop: 12 }}>
                  Checking API…
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
