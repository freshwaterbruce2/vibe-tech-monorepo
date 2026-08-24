/**
 * Security Agent - Specialized in security analysis and vulnerability detection.
 *
 * All analysis is produced by routing the agent's prompt through the real
 * UnifiedAIService (via the inherited process() pipeline). There is no canned
 * or fabricated finding data: when the AI request fails the base class returns
 * an honest empty result (confidence 0) rather than placeholder analysis.
 */
import type { AgentContext, AgentResponse } from './BaseSpecializedAgent';
import { AgentCapability, BaseSpecializedAgent } from './BaseSpecializedAgent';

const SECURITY_ANALYSIS_REQUEST =
  'Perform a security analysis of the current code and context. Identify concrete ' +
  'vulnerabilities with their severity, affected location, and remediation, and assess the ' +
  'OWASP/GDPR/PCI compliance posture. Report only issues substantiated by the provided context.';

const VULNERABILITY_SCAN_REQUEST =
  'Scan the current code and its dependencies for security vulnerabilities. For each finding, ' +
  'give the type, severity, affected file, and a concrete remediation. Do not invent findings ' +
  'that are not supported by the provided context.';

export class SecurityAgent extends BaseSpecializedAgent {
  constructor() {
    super('SecurityAgent', [
      AgentCapability.SECURITY_SCANNING,
      AgentCapability.VULNERABILITY_SCANNING,
      AgentCapability.PENETRATION_TESTING,
      AgentCapability.COMPLIANCE,
      AgentCapability.DATA_VALIDATION,
      AgentCapability.AUTHENTICATION,
      AgentCapability.CODE_REVIEW,
    ]);
  }

  getRole(): string {
    return 'Security Engineer';
  }

  getSpecialization(): string {
    return 'Security analysis, vulnerability detection, and compliance';
  }

  protected generatePrompt(request: string, context: AgentContext): string {
    return `As a Security Engineer, analyze the following request:

${request}

Context:
- Current file: ${context.currentFile ?? 'N/A'}
- Project type: ${context.projectType ?? 'Unknown'}
- Selected text: ${context.selectedText ?? 'None'}

Provide security analysis and vulnerability assessment.`;
  }

  protected analyzeResponse(response: string, _context: AgentContext): AgentResponse {
    return {
      content: response,
      confidence: 0.85,
      reasoning: 'Security analysis based on common vulnerabilities and best practices',
    };
  }

  /** Real AI-driven security analysis routed through UnifiedAIService. */
  async analyzeSecurity(context: AgentContext): Promise<AgentResponse> {
    return this.process(SECURITY_ANALYSIS_REQUEST, context);
  }

  /** Real AI-driven vulnerability scan routed through UnifiedAIService. */
  async scanVulnerabilities(context: AgentContext): Promise<AgentResponse> {
    return this.process(VULNERABILITY_SCAN_REQUEST, context);
  }

  async processRequest(request: string, context: AgentContext): Promise<AgentResponse> {
    const requestLower = request.toLowerCase();

    if (requestLower.includes('scan') || requestLower.includes('vulnerability')) {
      return this.scanVulnerabilities(context);
    }
    return this.analyzeSecurity(context);
  }
}
