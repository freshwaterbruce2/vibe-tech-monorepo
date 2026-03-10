// Data Export/Import Utilities for Symptom Tracker
// 2026 Enhancement - WCAG 2.2 AA Compliant

import type { SymptomEntry, Person } from '../api/client'

/**
 * Export symptom data to CSV format
 * Includes all fields: date, time, symptom, severity, duration, location, notes, tags
 */
export function exportToCSV(entries: SymptomEntry[], people: Person[]): string {
  const personMap = new Map(people.map(p => [p.id, p.name]))
  
  // CSV Headers
  const headers = [
    'Date',
    'Time',
    'Person',
    'Symptom',
    'Severity',
    'Duration (min)',
    'Location',
    'Tags',
    'Notes'
  ]
  
  const rows = entries.map(entry => {
    const personName = personMap.get(entry.personId) ?? 'Unknown'
    const tags = Array.isArray(entry.tags) ? entry.tags.join('; ') : ''

    return [
      entry.date,
      entry.time ?? '',
      personName,
      entry.symptom,
      entry.severity.toString(),
      entry.duration?.toString() ?? '',
      entry.location ?? '',
      tags,
      (entry.notes ?? '').replace(/"/g, '""') // Escape quotes
    ]
  })
  
  // Build CSV
  const csvLines = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ]
  
  return csvLines.join('\n')
}

/**
 * Export symptom data to JSON format
 * Preserves full data structure for re-import
 */
export function exportToJSON(
  entries: SymptomEntry[],
  people: Person[]
): string {
  const exportData = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    people,
    entries
  }
  
  return JSON.stringify(exportData, null, 2)
}

/**
 * Download exported data as a file
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  
  document.body.appendChild(link)
  link.click()
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, 100)
}

/**
 * Export symptoms to CSV and trigger download
 */
export function exportSymptomDataCSV(
  entries: SymptomEntry[],
  people: Person[]
): void {
  const csv = exportToCSV(entries, people)
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `symptom-tracker-export-${timestamp}.csv`
  
  downloadFile(csv, filename, 'text/csv;charset=utf-8;')
}

/**
 * Export symptoms to JSON and trigger download
 */
export function exportSymptomDataJSON(
  entries: SymptomEntry[],
  people: Person[]
): void {
  const json = exportToJSON(entries, people)
  const timestamp = new Date().toISOString().split('T')[0]
  const filename = `symptom-tracker-export-${timestamp}.json`
  
  downloadFile(json, filename, 'application/json;charset=utf-8;')
}

/**
 * Parse imported JSON data
 */
export function parseImportedJSON(jsonString: string): {
  entries: SymptomEntry[]
  people: Person[]
} {
  const data = JSON.parse(jsonString)
  
  if (!data.entries || !data.people) {
    throw new Error('Invalid export file format')
  }
  
  return {
    entries: data.entries,
    people: data.people
  }
}

/**
 * Validate imported data structure
 */
export function validateImportData(
  data: { entries: unknown; people: unknown }
): boolean {
  if (!Array.isArray(data.entries) || !Array.isArray(data.people)) {
    return false
  }
  
  // Basic validation - check required fields
  const hasValidEntries = data.entries.every(
    (e: unknown) => {
      if (typeof e !== 'object' || e === null) return false
      const entry = e as Record<string, unknown>
      return (
        entry.id &&
        entry.personId &&
        entry.date &&
        entry.symptom &&
        typeof entry.severity === 'number'
      )
    }
  )

  const hasValidPeople = data.people.every(
    (p: unknown) => {
      if (typeof p !== 'object' || p === null) return false
      const person = p as Record<string, unknown>
      return person.id && person.name
    }
  )
  
  return hasValidEntries && hasValidPeople
}
