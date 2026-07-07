import { describe, expect, it } from 'vitest';

import type { AgentContext, AgentResponse } from '../../services/specialized-agents/BaseSpecializedAgent';
import { CodeCorrectionAgent } from '../../services/specialized-agents/CodeCorrectionAgent';

interface CorrectionAgentInternals {
  generatePrompt: (request: string, context: AgentContext) => string;
  analyzeResponse: (response: string, context: AgentContext) => AgentResponse;
}

function getInternals(agent: CodeCorrectionAgent): CorrectionAgentInternals {
  return agent as unknown as CorrectionAgentInternals;
}

describe('CodeCorrectionAgent', () => {
  it('exposes correction-focused capabilities and metadata', () => {
    const agent = new CodeCorrectionAgent();
    const capabilities = agent.getCapabilities();

    expect(agent.getRole()).toContain('root-cause');
    expect(agent.getSpecialization()).toContain('Code correction');
    expect(capabilities).toEqual(
      expect.arrayContaining([
        'debugging',
        'error_handling',
        'code_analysis',
        'code_review',
        'refactoring',
        'testing',
        'best_practices',
      ])
    );
  });

  it('builds a correction prompt with contextual constraints', () => {
    const agent = new CodeCorrectionAgent();
    const internals = getInternals(agent);

    const prompt = internals.generatePrompt(
      'Fix failing parser unit test',
      {
        currentFile: 'src/parser.ts',
        selectedText: 'export function parse(input: string) { throw new Error("boom"); }',
        relatedFiles: ['src/parser.test.ts'],
      }
    );

    expect(prompt).toContain('Correction flow requirements');
    expect(prompt).toContain('Current file: src/parser.ts');
    expect(prompt).toContain('Fix failing parser unit test');
    expect(prompt).toContain('Provide verification steps');
  });

  it('extracts structured correction signals from a detailed response', () => {
    const agent = new CodeCorrectionAgent();
    const internals = getInternals(agent);

    const response = `
1. Fix null access by adding an early return guard.
- Add regression test covering undefined payload.
Root cause is missing null-check in the parser path.
Verify with lint and typecheck, then run targeted test.
Mitigate regression risk by keeping patch scope minimal.
\`\`\`ts
if (!payload) {
  return null;
}
\`\`\`
`;

    const analyzed = internals.analyzeResponse(response, {
      currentFile: 'src/parser.ts',
      selectedText: 'const value = payload.value;',
    });

    expect(analyzed.confidence).toBeGreaterThanOrEqual(0.8);
    expect(analyzed.suggestions ?? []).toContain('Fix null access by adding an early return guard.');
    expect(analyzed.codeChanges?.[0]?.filePath).toBe('src/parser.ts');
    expect(analyzed.relatedTopics ?? []).toEqual(
      expect.arrayContaining(['Root Cause Analysis', 'Regression Prevention', 'Verification'])
    );
  });

  it('adds follow-up questions when response omits verification details', () => {
    const agent = new CodeCorrectionAgent();
    const internals = getInternals(agent);

    const analyzed = internals.analyzeResponse('Apply a minimal patch to fix the crash.', {});

    expect(analyzed.followupQuestions ?? []).toEqual(
      expect.arrayContaining([
        'Should I add targeted regression tests for this fix path?',
        'Would you like a concrete lint/typecheck/test verification checklist?',
        'Do you want a rollback strategy if this fix introduces side effects?',
      ])
    );
  });
});
