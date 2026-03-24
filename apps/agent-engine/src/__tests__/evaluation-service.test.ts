import type {
  BehavioralAssertion,
  BehavioralEvalCase,
  LlmProvider,
  ProviderPrompt,
} from '../types.js';
import { EvaluationService } from '../services/evaluation-service.js';

function collectResponseIncludeValues(assertions: BehavioralAssertion[]): string[] {
  return assertions.flatMap((assertion) =>
    assertion.type === 'response-must-include' ? assertion.values : [],
  );
}

function collectSourceDomains(assertions: BehavioralAssertion[]): string[] {
  return assertions.flatMap((assertion) =>
    assertion.type === 'source-domain-required'
      ? assertion.domains.map((domain) => `https://docs.${domain}/reference`)
      : [],
  );
}

function getMinimumSources(assertions: BehavioralAssertion[]): number {
  return assertions.reduce(
    (maximum, assertion) =>
      assertion.type === 'sources-required' ? Math.max(maximum, assertion.minimum) : maximum,
    0,
  );
}

function parseCase(prompt: ProviderPrompt): BehavioralEvalCase {
  const marker = 'CASE_JSON:';
  const start = prompt.user.indexOf(marker);
  const remainder = prompt.user.slice(start + marker.length);
  const end = remainder.indexOf('\nPRIOR_ROLE_OUTPUTS:');
  return JSON.parse((end >= 0 ? remainder.slice(0, end) : remainder).trim()) as BehavioralEvalCase;
}

describe('evaluation service behavioral runner', () => {
  it('executes structured behavioral cases and produces passing suite results', async () => {
    const provider: LlmProvider = {
      name: 'pass-provider',
      async generateText(prompt) {
        const testCase = parseCase(prompt);
        const includeValues = collectResponseIncludeValues(testCase.assertions);
        const domains = collectSourceDomains(testCase.assertions);
        const minimumSources = getMinimumSources(testCase.assertions);
        const sources = [...new Set([...domains, 'https://example.com/reference'])];
        while (sources.length < minimumSources) {
          sources.push(`https://example.com/reference-${sources.length + 1}`);
        }
        return {
          text: JSON.stringify({
            summary: `${testCase.id} passed`,
            requestedTools: ['web-search', 'glob', 'grep', 'read-existing', 'feature-spec'],
            sources,
            duplicateChecks: ['glob', 'grep', 'read-existing', 'feature-spec'],
            askUser: true,
            response: [
              'Verified guidance',
              ...includeValues,
              'verify',
              'existing Button',
              'existing Card',
            ]
              .join(' ')
              .trim(),
            findings: [],
            decision: 'pass',
          }),
        };
      },
    };

    const service = new EvaluationService('C:\\dev', provider);
    const suites = await service.runBehavioralSuites();

    expect(suites).toHaveLength(2);
    expect(suites.every((suite) => suite.passed)).toBe(true);
    expect(suites.every((suite) => suite.score >= suite.threshold)).toBe(true);
  });

  it('fails a suite when critical behavioral assertions are missed', async () => {
    const provider: LlmProvider = {
      name: 'fail-provider',
      async generateText(prompt) {
        const testCase = parseCase(prompt);
        return {
          text: JSON.stringify({
            summary: `${testCase.id} failed`,
            requestedTools: [],
            sources: [],
            duplicateChecks: [],
            askUser: false,
            response: `Static answer for ${testCase.input}`,
            findings: ['Skipped required search'],
            decision: 'fail',
          }),
        };
      },
    };

    const service = new EvaluationService('C:\\dev', provider);
    const suites = await service.runBehavioralSuites();
    const webSearchSuite = suites.find(
      (suite) => suite.suite === 'behavioral-web-search-grounding',
    );

    expect(webSearchSuite).toBeDefined();
    expect(webSearchSuite?.passed).toBe(false);

    const parsed = JSON.parse(webSearchSuite?.rawOutput ?? '{}') as {
      cases?: Array<{ id: string; passed: boolean; criticalFailure: boolean }>;
    };
    expect(parsed.cases?.some((entry) => entry.id === 'TEST-001' && !entry.passed)).toBe(true);
    expect(parsed.cases?.some((entry) => entry.id === 'TEST-001' && entry.criticalFailure)).toBe(
      true,
    );
  });

  it('uses the scripted provider for deterministic repo-local evaluation when requested', async () => {
    const service = new EvaluationService('C:\\dev', 'scripted');
    const suites = await service.runBehavioralSuites();

    expect(suites).toHaveLength(2);
    expect(suites.every((suite) => suite.passed)).toBe(true);
    expect(suites[0]?.details[0]).toBe('Provider: scripted-behavioral');
  });
});
