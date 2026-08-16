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

export interface EvidenceChunk {
  chunk_id: string;
  evidence_id: string;
  ordinal: number;
  quote: string;
  page_number: number | null;
  paragraph_index: number | null;
  char_start: number;
  char_end: number;
  text_sha256: string;
  extraction_attempt_id: string;
}

export interface EvidenceIndexStatus {
  evidence_id: string;
  status: string;
  chunk_count: number;
  text_sha256: string | null;
}

export interface EvidenceChunksResponse {
  evidence_id: string;
  status: string;
  chunks: EvidenceChunk[];
}

export interface EvidenceSearchResult extends EvidenceChunk {
  original_filename: string;
  score: number;
  match_terms: string[];
}

export interface EvidenceSearchResponse {
  query: string;
  results: EvidenceSearchResult[];
  total: number;
}

export interface LegalPackSource {
  source_id: string;
  title: string;
  canonical_url: string;
  official: boolean;
  status: string;
  sha256: string;
  excerpt: string;
  locator: string;
}

export interface LegalPack {
  pack_id: string;
  jurisdiction: string;
  matter_type: string;
  version: string;
  as_of: string;
  status: string;
  retrieval_status: string;
  approval_status: string;
  retrieved_at: string;
  sha256: string;
  sources: LegalPackSource[];
}

export interface LegalPackElement {
  element_id: string;
  ordinal: number;
  authority_text: string;
  applicability: string;
  status: string;
}

export interface LegalPackSourceDetail extends LegalPackSource {
  pack_id: string;
  pack_status: string;
  approval_status: string;
  version: string;
  as_of: string;
  retrieved_at: string;
  elements: LegalPackElement[];
}

export interface LegalPacksResponse {
  packs: LegalPack[];
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
  async listLegalPacks(): Promise<LegalPacksResponse> {
    const response = await fetch(`${API_BASE}/legal-packs`, { method: 'GET', headers: jsonHeaders() });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`List legal packs failed: ${response.status} ${errorText}`);
    }
    return response.json() as Promise<LegalPacksResponse>;
  },

  async getLegalPackSource(packId: string, sourceId: string): Promise<LegalPackSourceDetail> {
    const response = await fetch(`${API_BASE}/legal-packs/${encodeURIComponent(packId)}/sources/${encodeURIComponent(sourceId)}`, { method: 'GET', headers: jsonHeaders() });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Get legal pack source failed: ${response.status} ${errorText}`);
    }
    return response.json() as Promise<LegalPackSourceDetail>;
  },
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

  async indexEvidence(caseId: string, evidenceId: string): Promise<EvidenceIndexStatus> {
    const response = await fetch(
      `${API_BASE}/cases/${encodeURIComponent(caseId)}/evidence/${encodeURIComponent(evidenceId)}/index`,
      { method: 'POST', headers: jsonHeaders() },
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Index evidence failed: ${response.status} ${errorText}`);
    }
    return response.json() as Promise<EvidenceIndexStatus>;
  },

  async getEvidenceChunks(caseId: string, evidenceId: string): Promise<EvidenceChunksResponse> {
    const response = await fetch(
      `${API_BASE}/cases/${encodeURIComponent(caseId)}/evidence/${encodeURIComponent(evidenceId)}/chunks`,
      { method: 'GET', headers: jsonHeaders() },
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Get evidence index failed: ${response.status} ${errorText}`);
    }
    return response.json() as Promise<EvidenceChunksResponse>;
  },

  async searchEvidence(caseId: string, query: string, limit: number = 20): Promise<EvidenceSearchResponse> {
    const params = new URLSearchParams({ q: query, limit: String(limit) });
    const response = await fetch(
      `${API_BASE}/cases/${encodeURIComponent(caseId)}/evidence/search?${params.toString()}`,
      { method: 'GET', headers: jsonHeaders() },
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Search evidence failed: ${response.status} ${errorText}`);
    }
    return response.json() as Promise<EvidenceSearchResponse>;
  },

  async downloadEvidenceOriginal(caseId: string, evidenceId: string): Promise<Blob> {
    const response = await fetch(
      `${API_BASE}/cases/${encodeURIComponent(caseId)}/evidence/${encodeURIComponent(evidenceId)}/original`,
      { method: 'GET', headers: authHeaders() },
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Download evidence failed: ${response.status} ${errorText}`);
    }
    return response.blob();
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
