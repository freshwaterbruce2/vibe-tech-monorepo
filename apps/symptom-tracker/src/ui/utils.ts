export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function severityClass(severity: number): 'low' | 'mid' | 'high' {
  if (severity >= 7) return 'high'
  if (severity >= 4) return 'mid'
  return 'low'
}

export function parseTags(tagsText: string): string[] | undefined {
  const tags = tagsText
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20)
  return tags.length ? tags : undefined
}

export function safeTagsToStrings(tags: unknown): string[] {
  if (!tags) return []
  if (Array.isArray(tags) && tags.every((t) => typeof t === 'string')) return tags
  return []
}

export function getDefaultFilters() {
  return { from: '', to: '', q: '' }
}

export function getDefaultFormState(): FormState {
  return {
    date: todayIso(),
    time: '',
    symptom: '',
    severity: 5,
    tagsText: '',
    notes: '',
  }
}

export interface FormState {
  date: string
  time: string
  symptom: string
  severity: number
  tagsText: string
  notes: string
}

export function validateForm(form: FormState, selectedPersonId: string): { valid: boolean; error?: string } {
  if (!selectedPersonId) {
    return { valid: false, error: 'No person selected' }
  }
  
  const symptom = form.symptom.trim()
  if (!symptom) {
    return { valid: false, error: 'Please enter a symptom name.' }
  }
  
  if (symptom.length < 2) {
    return { valid: false, error: 'Symptom name must be at least 2 characters.' }
  }
  
  if (form.severity < 0 || form.severity > 10) {
    return { valid: false, error: 'Severity must be between 0 and 10.' }
  }
  
  return { valid: true }
}

export function prepareEntryPayload(
  form: FormState,
  personId: string
) {
  const payload = {
    personId,
    date: form.date,
    time: form.time ? form.time : undefined,
    symptom: form.symptom.trim(),
    severity: form.severity,
    notes: form.notes.trim() ? form.notes.trim() : undefined,
    tags: parseTags(form.tagsText),
  }
  
  return payload
}
