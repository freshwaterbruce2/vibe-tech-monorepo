// Re-export the centralized axios instance so callers can switch progressively.
export { httpClient } from './httpClient';

const API_BASE = `${import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}/api`;

const authHeaders = (): HeadersInit => {
  const apiKey = import.meta.env.VITE_VIBE_JUSTICE_API_KEY;
  return apiKey ? { 'X-API-Key': apiKey } : {};
};

const jsonHeaders = (): HeadersInit => ({
  'Content-Type': 'application/json',
  ...authHeaders(),
});

export interface ChatResponse {
  content: string;
  reasoning?: string;
  model_used?: string;
  message?: string;
}

export interface Case {
  case_id: string;
  name: string;
  created_at: string;
  status: string;
  jurisdiction: string;
  research_goals: string;
  assigned_agent: string;
  is_archived: boolean;
  archived_at: string | null;
}

export interface CreateCaseRequest {
  name: string;
  jurisdiction: string;
  goals: string;
}

export type ExtractionStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'unsupported' | 'encrypted';

export interface ExtractionAttempt {
  attempt_id: string;
  status: ExtractionStatus;
  extractor_name?: string;
  extractor_version?: string;
  started_at: string;
  completed_at: string | null;
  page_count: number | null;
  error_code: string | null;
  error_message: string | null;
}

export interface EvidenceRecord {
  evidence_id: string;
  case_id: string;
  original_filename: string;
  byte_length: number;
  sha256: string;
  declared_mime: string | null;
  detected_mime: string;
  imported_at: string;
  source_label: string;
  received_from: string | null;
  notes: string | null;
  evidence_date: string | null;
  lifecycle_status: string;
  same_content_as: string | null;
  latest_extraction: ExtractionAttempt | null;
}

export interface EvidenceProvenance {
  sourceLabel: string;
  receivedFrom?: string;
  notes?: string;
  evidenceDate?: string;
}

interface EvidenceApiRecord {
  evidence_id: string;
  case_id: string;
  display_filename: string;
  byte_length: number;
  sha256: string;
  declared_mime: string | null;
  detected_mime: string;
  imported_at: string;
  source_label: string;
  received_from: string | null;
  notes: string | null;
  evidence_date: string | null;
  status: string;
  same_content_as: string | null;
  attempts: ExtractionAttempt[];
}

const normalizeEvidence = (record: EvidenceApiRecord): EvidenceRecord => ({
  ...record,
  original_filename: record.display_filename,
  lifecycle_status: record.status,
  latest_extraction: record.attempts[record.attempts.length - 1] ?? null,
});

export const justiceApi = {
  async createCase(request: CreateCaseRequest): Promise<Case> {
    const response = await fetch(`${API_BASE}/cases/create`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify(request),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Create case failed: ${response.status} ${errorText}`);
    }
    return response.json() as Promise<Case>;
  },

  async getCase(caseId: string): Promise<Case> {
    const response = await fetch(`${API_BASE}/cases/${encodeURIComponent(caseId)}`, {
      method: 'GET',
      headers: jsonHeaders(),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Get case failed: ${response.status} ${errorText}`);
    }
    return response.json() as Promise<Case>;
  },

  async getCurrentCase(): Promise<Case | null> {
    const response = await fetch(`${API_BASE}/cases/current`, {
      method: 'GET',
      headers: jsonHeaders(),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Get current case failed: ${response.status} ${errorText}`);
    }
    const payload = await response.json() as { current_case: Case | null };
    return payload.current_case;
  },

  async setCurrentCase(caseId: string): Promise<Case | null> {
    const response = await fetch(`${API_BASE}/cases/current`, {
      method: 'PUT',
      headers: jsonHeaders(),
      body: JSON.stringify({ case_id: caseId }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Set current case failed: ${response.status} ${errorText}`);
    }
    const payload = await response.json() as { current_case: Case | null };
    return payload.current_case;
  },

  async uploadEvidence(file: File, caseId: string, provenance: EvidenceProvenance = { sourceLabel: 'Unspecified source' }): Promise<EvidenceRecord> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source_label', provenance.sourceLabel);
    if (provenance.receivedFrom) formData.append('received_from', provenance.receivedFrom);
    if (provenance.notes) formData.append('notes', provenance.notes);
    if (provenance.evidenceDate) formData.append('evidence_date', provenance.evidenceDate);

    const response = await fetch(`${API_BASE}/cases/${encodeURIComponent(caseId)}/evidence`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${errorText}`);
    }

    return normalizeEvidence(await response.json() as EvidenceApiRecord);
  },

  async listEvidence(caseId: string): Promise<EvidenceRecord[]> {
    const response = await fetch(`${API_BASE}/cases/${encodeURIComponent(caseId)}/evidence`, {
      method: 'GET',
      headers: jsonHeaders(),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`List evidence failed: ${response.status} ${errorText}`);
    }
    return (await response.json() as EvidenceApiRecord[]).map(normalizeEvidence);
  },

  async retryEvidenceExtraction(caseId: string, evidenceId: string): Promise<EvidenceRecord> {
    const response = await fetch(
      `${API_BASE}/cases/${encodeURIComponent(caseId)}/evidence/${encodeURIComponent(evidenceId)}/extract`,
      { method: 'POST', headers: jsonHeaders() },
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Retry extraction failed: ${response.status} ${errorText}`);
    }
    return normalizeEvidence(await response.json() as EvidenceApiRecord);
  },

  /**
   * Triggers the DeepSeek R1 analysis pipeline.
   * Endpoint: POST /api/analysis/run
   */
  async runAnalysis(caseId: string, documentIds: string[] = []) {
    const response = await fetch(`${API_BASE}/analysis/run`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ 
        case_id: caseId, 
        document_ids: documentIds 
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Analysis failed: ${response.status} ${errorText}`);
    }

    return response.json();
  },

  /**
   * Sends a chat message to the backend chat endpoint.
   * Endpoint: POST /api/chat/simple
   */
  async sendChat(message: string, options?: { domain?: string; use_reasoning?: boolean; model_type?: 'local' | 'cloud' }): Promise<ChatResponse> {
    const response = await fetch(`${API_BASE}/chat/simple`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({
        message,
        domain: options?.domain ?? 'general',
        use_reasoning: options?.use_reasoning,
        model_type: options?.model_type ?? 'local',
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Chat failed: ${response.status} ${errorText}`);
    }

    return response.json() as Promise<ChatResponse>;
  },

  /**
   * Lists all cases from the backend.
   * Endpoint: GET /api/cases/list
   */
  async listCases(includeArchived: boolean = false): Promise<Case[]> {
    const response = await fetch(`${API_BASE}/cases/list?include_archived=${includeArchived}`, {
      method: 'GET',
      headers: jsonHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`List cases failed: ${response.status} ${errorText}`);
    }

    return response.json() as Promise<Case[]>;
  },

  /**
   * Archives a case.
   * Endpoint: POST /api/cases/archive/{case_id}
   */
  async archiveCase(caseId: string): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_BASE}/cases/archive/${encodeURIComponent(caseId)}`, {
      method: 'POST',
      headers: jsonHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Archive case failed: ${response.status} ${errorText}`);
    }

    return response.json();
  },

  /**
   * Restores an archived case.
   * Endpoint: POST /api/cases/restore/{case_id}
   */
  async restoreCase(caseId: string): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_BASE}/cases/restore/${encodeURIComponent(caseId)}`, {
      method: 'POST',
      headers: jsonHeaders(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Restore case failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }
};
