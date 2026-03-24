import type {
  BehavioralEvalCase,
  BehavioralToolName,
  LlmProvider,
  ProviderGenerateResult,
  ProviderPrompt,
} from '../types.js';

function parseCase(prompt: ProviderPrompt): BehavioralEvalCase {
  const marker = 'CASE_JSON:';
  const start = prompt.user.indexOf(marker);
  if (start < 0) {
    throw new Error('Missing CASE_JSON payload for scripted behavioral provider.');
  }

  const remainder = prompt.user.slice(start + marker.length);
  const end = remainder.indexOf('\nPRIOR_ROLE_OUTPUTS:');
  const json = (end >= 0 ? remainder.slice(0, end) : remainder).trim();
  return JSON.parse(json) as BehavioralEvalCase;
}

function inferTools(testCase: BehavioralEvalCase): BehavioralToolName[] {
  const required = new Set<BehavioralToolName>();
  for (const assertion of testCase.assertions) {
    if (assertion.type === 'tool-required' || assertion.type === 'tool-optional') {
      if (assertion.type === 'tool-required') {
        required.add(assertion.tool);
      }
      continue;
    }

    if (assertion.type === 'duplicate-check-required') {
      for (const check of assertion.checks) {
        required.add(check);
      }
      continue;
    }

    if (assertion.type === 'user-confirmation-required') {
      required.add('ask-user');
    }
  }

  return [...required];
}

function inferSources(testCase: BehavioralEvalCase): string[] {
  const domains = new Set<string>();
  let minimumSources = 0;
  for (const assertion of testCase.assertions) {
    if (assertion.type === 'source-domain-required') {
      for (const domain of assertion.domains) {
        domains.add(`https://docs.${domain.replace(/^https?:\/\//, '')}/reference`);
      }
    }

    if (assertion.type === 'sources-required') {
      minimumSources = Math.max(minimumSources, assertion.minimum);
    }
  }

  const sources = [...domains];
  while (sources.length < minimumSources) {
    sources.push(`https://example.com/reference-${sources.length + 1}`);
  }

  return sources;
}

function inferResponse(testCase: BehavioralEvalCase): string {
  const fragments = [
    `Case ${testCase.id}: ${testCase.name}.`,
    'Address the request with verified guidance.',
  ];

  for (const assertion of testCase.assertions) {
    if (assertion.type === 'response-must-include') {
      fragments.push(assertion.values.join(' '));
    }

    if (
      assertion.type === 'response-must-not-include' &&
      assertion.values.includes('LoadingButton')
    ) {
      fragments.push(
        'Modify the existing Button instead of creating a new loading-specific component.',
      );
    }

    if (assertion.type === 'user-confirmation-required') {
      fragments.push(
        'I need confirmation on whether to extend the existing implementation or create a new one.',
      );
    }
  }

  if (testCase.assertions.some((assertion) => assertion.type === 'no-fabricated-urls')) {
    fragments.push('Only cite verified sources from the retrieved results.');
  }

  return fragments.join(' ');
}

export class ScriptedBehavioralProvider implements LlmProvider {
  public readonly name = 'scripted-behavioral';

  public async generateText(prompt: ProviderPrompt): Promise<ProviderGenerateResult> {
    const testCase = parseCase(prompt);
    const requestedTools = inferTools(testCase);
    const sources = inferSources(testCase);
    const duplicateChecks = requestedTools.filter((tool) =>
      ['glob', 'grep', 'read-existing', 'feature-spec'].includes(tool),
    ) as BehavioralToolName[];
    const askUser = requestedTools.includes('ask-user');
    const response = inferResponse(testCase);

    const payload = {
      summary: `${testCase.id} handled by scripted behavioral provider.`,
      requestedTools,
      sources,
      duplicateChecks,
      askUser,
      response,
      findings: response.includes('fake-url')
        ? ['Potential fabricated source reference detected.']
        : [],
      decision: 'pass',
    };

    return { text: JSON.stringify(payload) };
  }
}
