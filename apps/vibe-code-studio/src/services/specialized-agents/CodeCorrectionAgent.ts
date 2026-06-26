/**
 * Code Correction Agent - Root-cause focused bug fixing specialist
 */
import type { AgentContext, AgentResponse, CodeChange } from './BaseSpecializedAgent';
import { AgentCapability, BaseSpecializedAgent } from './BaseSpecializedAgent';

export class CodeCorrectionAgent extends BaseSpecializedAgent {
  constructor() {
    super('Code Correction Agent', [
      AgentCapability.DEBUGGING,
      AgentCapability.ERROR_HANDLING,
      AgentCapability.CODE_ANALYSIS,
      AgentCapability.CODE_REVIEW,
      AgentCapability.REFACTORING,
      AgentCapability.TESTING,
      AgentCapability.BEST_PRACTICES,
    ]);
  }

  getRole(): string {
    return 'Bug-fix specialist focused on root-cause analysis and safe remediation';
  }

  getSpecialization(): string {
    return 'Code correction, regression prevention, targeted patching, and verification planning';
  }

  protected generatePrompt(request: string, context: AgentContext): string {
    const correctionContext = this.buildCorrectionContext(context);

    return `You are a senior Code Correction Agent. Your job is to repair broken code safely and prevent regressions.

CONTEXT:
${correctionContext}

REQUEST:
${request}

Correction flow requirements:
1. Confirm likely failure mode and affected behavior.
2. Identify probable root cause with the smallest correct fix scope.
3. Propose a minimal patch first (avoid broad refactors unless required).
4. Call out stale/incorrect file-target risk if the request points to the wrong layer.
5. Provide verification steps (tests/typecheck/lint and runtime checks).
6. Highlight regression risks and how to mitigate them.

Response requirements:
- Be explicit, actionable, and production-focused.
- Include code-level recommendations with rationale.
- Suggest targeted tests that prove the fix and guard against recurrence.
- If uncertainty remains, state assumptions and decision points clearly.`;
  }

  protected analyzeResponse(response: string, context: AgentContext): AgentResponse {
    const confidence = this.calculateCorrectionConfidence(response, context);
    const suggestions = this.extractCorrectionSuggestions(response);
    const codeChanges = this.identifyCodeChanges(response, context);

    return {
      content: response,
      confidence,
      suggestions,
      codeChanges,
      followupQuestions: this.generateCorrectionFollowups(response, context),
      relatedTopics: this.identifyCorrectionTopics(response),
    };
  }

  private buildCorrectionContext(context: AgentContext): string {
    let info = '';

    if (context.currentFile) {
      info += `Current file: ${context.currentFile}\n`;
    }

    if (context.selectedText) {
      info += `Selected code snippet:\n\`\`\`\n${context.selectedText.slice(0, 600)}\n\`\`\`\n`;
    }

    if (context.relatedFiles && context.relatedFiles.length > 0) {
      info += `Related files: ${context.relatedFiles.slice(0, 8).join(', ')}\n`;
    }

    if (context.sessionHistory && context.sessionHistory.length > 0) {
      const lastTask = context.sessionHistory[0]?.request;
      if (lastTask) {
        info += `Recent request context: ${lastTask.slice(0, 140)}\n`;
      }
    }

    if (context.userPreferences?.['technicalGuidance']) {
      info += `Technical guidance: ${String(context.userPreferences['technicalGuidance']).slice(0, 220)}\n`;
    }

    return info || 'No additional correction context provided.';
  }

  private calculateCorrectionConfidence(response: string, context: AgentContext): number {
    let confidence = 0.76;
    const lower = response.toLowerCase();

    const correctionTerms = [
      'root cause',
      'fix',
      'patch',
      'regression',
      'test',
      'verify',
      'error handling',
      'failure mode',
      'stack trace',
    ];

    const matchedTerms = correctionTerms.filter((term) => lower.includes(term)).length;
    confidence += Math.min(matchedTerms * 0.02, 0.16);

    if (response.includes('```')) {
      confidence += 0.05;
    }

    if (context.currentFile) {
      confidence += 0.03;
    }

    if (context.selectedText) {
      confidence += 0.03;
    }

    if (response.length < 160) {
      confidence -= 0.12;
    }

    return Math.min(0.95, Math.max(0.5, confidence));
  }

  private extractCorrectionSuggestions(response: string): string[] {
    const suggestions: string[] = [];

    const numberedItems = response.match(/\d+\.\s*([^\n]+)/g);
    if (numberedItems) {
      suggestions.push(...numberedItems.map((item) => item.replace(/\d+\.\s*/, '').trim()));
    }

    const bulletItems = response.match(/[-*]\s*([^\n]+)/g);
    if (bulletItems) {
      suggestions.push(...bulletItems.map((item) => item.replace(/[-*]\s*/, '').trim()));
    }

    const correctionPatterns = [
      /(?:fix|patch|correct)\s+([^.]+)/gi,
      /(?:add|write)\s+([^.]+(?:test|validation|guard)[^.]*)/gi,
      /(?:verify|validate)\s+([^.]+)/gi,
      /(?:prevent|mitigate)\s+([^.]+(?:regression|failure|risk)[^.]*)/gi,
    ];

    correctionPatterns.forEach((pattern) => {
      const matches = response.match(pattern);
      if (matches) {
        suggestions.push(...matches.map((match) => match.trim()));
      }
    });

    return [...new Set(suggestions)].slice(0, 10);
  }

  private identifyCodeChanges(response: string, context: AgentContext): CodeChange[] {
    const changes: CodeChange[] = [];
    const codeBlocks = response.match(/```[\w]*\n([\s\S]*?)\n```/g);

    if (!codeBlocks || !context.currentFile) {
      return changes;
    }

    codeBlocks.forEach((block, index) => {
      const code = block.replace(/```[\w]*\n/, '').replace(/\n```$/, '');
      if (!code.trim()) {
        return;
      }

      changes.push({
        filePath: context.currentFile ?? '',
        type: 'modify',
        content: code,
        description: `Proposed correction patch ${index + 1}`,
      });
    });

    return changes;
  }

  private generateCorrectionFollowups(response: string, context: AgentContext): string[] {
    const questions: string[] = [];
    const lower = response.toLowerCase();

    if (!lower.includes('test')) {
      questions.push('Should I add targeted regression tests for this fix path?');
    }

    if (!lower.includes('verification')) {
      questions.push('Would you like a concrete lint/typecheck/test verification checklist?');
    }

    if (!lower.includes('rollback') && !lower.includes('risk')) {
      questions.push('Do you want a rollback strategy if this fix introduces side effects?');
    }

    if (!context.currentFile) {
      questions.push('Can I narrow the fix to a specific file or failing stack frame?');
    }

    return questions.slice(0, 3);
  }

  private identifyCorrectionTopics(response: string): string[] {
    const topics: string[] = [];

    const mapping = {
      'Root Cause Analysis': ['root cause', 'failure mode', 'diagnose'],
      Debugging: ['debug', 'error', 'exception', 'stack trace'],
      'Patch Safety': ['minimal patch', 'scope', 'safe change', 'backward compatible'],
      'Regression Prevention': ['regression', 'guard', 'coverage', 'test'],
      Verification: ['verify', 'validation', 'lint', 'typecheck'],
      'Error Handling': ['error handling', 'fallback', 'retry', 'graceful'],
    };

    const lower = response.toLowerCase();

    Object.entries(mapping).forEach(([topic, keywords]) => {
      if (keywords.some((keyword) => lower.includes(keyword))) {
        topics.push(topic);
      }
    });

    return topics;
  }
}
