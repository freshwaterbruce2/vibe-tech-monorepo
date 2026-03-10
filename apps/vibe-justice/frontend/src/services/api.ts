const API_BASE = 'http://localhost:8000/api';

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

export const justiceApi = {
  /**
   * Uploads a file to the Vibe-Justice backend.
   * Endpoint: POST /api/evidence
   */
  async uploadEvidence(file: File, caseId: string) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('case_id', caseId);

    const response = await fetch(`${API_BASE}/evidence`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Upload failed: ${response.status} ${errorText}`);
    }

    return response.json();
  },

  /**
   * Triggers the DeepSeek R1 analysis pipeline.
   * Endpoint: POST /api/analysis/run
   */
  async runAnalysis(caseId: string, documentIds: string[] = []) {
    const response = await fetch(`${API_BASE}/analysis/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Restore case failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }
};