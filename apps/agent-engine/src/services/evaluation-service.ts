import { readFileSync } from 'fs';
import { join } from 'path';
import { DEFAULT_POLICY_BUNDLE } from '../policy/default-policy.js';
import { createBehavioralProvider } from '../providers/base.js';
import type {
  BehavioralAssertion,
  BehavioralAssertionResult,
  BehavioralCaseResult,
  BehavioralEvalCase,
  BehavioralExecutionTrace,
  BehavioralProviderMode,
  BehavioralRolePayload,
  BehavioralSuiteCollection,
  BehavioralSuiteDefinition,
  EvalSuiteResult,
  LlmProvider,
  RoleTransition,
} from '../types.js';
import { runCommand } from '../tools/process-tools.js';

interface SuiteDefinition {
  name: string;
  command: string;
  cwd: string;
  threshold?: number;
}

const ROLE_ORDER = [
  'planner',
  'coder',
  'reviewer',
  'gatekeeper',
  'memory-curator',
  'self-improver',
  'supervisor',
] as const;

export class EvaluationService {
  private readonly behavioralProvider: LlmProvider;

  public constructor(
    private readonly workspaceRoot: string,
    behavioralProviderOrMode?: LlmProvider | BehavioralProviderMode,
  ) {
    this.behavioralProvider =
      typeof behavioralProviderOrMode === 'string'
        ? createBehavioralProvider(behavioralProviderOrMode)
        : (behavioralProviderOrMode ?? createBehavioralProvider());
  }

  public runNxProjectSuites(project = 'agent-engine'): EvalSuiteResult[] {
    const suites: SuiteDefinition[] = ['build', 'typecheck', 'lint', 'test'].map((target) => ({
      name: `nx-${project}-${target}`,
      command: `pnpm nx run ${project}:${target}`,
      cwd: this.workspaceRoot,
      threshold: 1,
    }));

    return this.runSuites(suites);
  }

  public async runBehavioralSuites(): Promise<EvalSuiteResult[]> {
    const suites = this.loadBehavioralSuites();
    const results: EvalSuiteResult[] = [];

    for (const suite of suites) {
      const caseResults: BehavioralCaseResult[] = [];
      const started = Date.now();

      for (const testCase of suite.cases) {
        try {
          caseResults.push(await this.runBehavioralCase(testCase));
        } catch (error) {
          caseResults.push({
            id: testCase.id,
            name: testCase.name,
            category: testCase.category,
            passed: false,
            score: 0,
            criticalFailure: true,
            assertionResults: [],
            trace: {
              caseId: testCase.id,
              provider: this.behavioralProvider.name,
              requestedTools: [],
              duplicateChecks: [],
              sources: [],
              askUser: false,
              response:
                error instanceof Error ? error.message : 'Unknown behavioral execution failure',
              roleTransitions: [],
            },
          });
        }
      }

      const score =
        caseResults.length === 0
          ? 0
          : caseResults.reduce((total, result) => total + result.score, 0) / caseResults.length;
      const criticalFailures = caseResults.filter((result) => result.criticalFailure);
      const passed = criticalFailures.length === 0 && score >= suite.threshold;

      results.push({
        suite: suite.id,
        passed,
        score: Number(score.toFixed(4)),
        threshold: suite.threshold,
        durationMs: Date.now() - started,
        details: [
          `Provider: ${this.behavioralProvider.name}`,
          `Cases passed: ${caseResults.filter((result) => result.passed).length}/${caseResults.length}`,
          `Critical failures: ${criticalFailures.length}`,
          ...caseResults
            .slice(0, 10)
            .map(
              (result) =>
                `${result.id}: ${result.passed ? 'PASS' : 'FAIL'} (${result.score.toFixed(2)})`,
            ),
        ],
        rawOutput: JSON.stringify(
          {
            provider: this.behavioralProvider.name,
            cases: caseResults,
          },
          null,
          2,
        ),
      });
    }

    return results;
  }

  public async runRepoLocalSuites(project = 'agent-engine'): Promise<EvalSuiteResult[]> {
    return [...this.runNxProjectSuites(project), ...(await this.runBehavioralSuites())];
  }

  public summarizeScore(results: EvalSuiteResult[]): number {
    if (results.length === 0) {
      return 0;
    }

    return results.reduce((total, result) => total + result.score, 0) / results.length;
  }

  public loadBehavioralSuites(): BehavioralSuiteDefinition[] {
    const fixturePath = join(
      this.workspaceRoot,
      'tests',
      'agent-evaluation',
      'behavioral-suites.json',
    );
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8')) as BehavioralSuiteCollection;
    return fixture.suites;
  }

  private runSuites(suites: SuiteDefinition[]): EvalSuiteResult[] {
    return suites.map((suite) => {
      const result = runCommand(suite.command, {
        cwd: suite.cwd,
        timeout: 300000,
      });

      const rawOutput = `${result.stdout}\n${result.stderr}`.trim();
      const passed = result.success;
      const score = passed ? 1 : 0;

      return {
        suite: suite.name,
        passed,
        score,
        threshold: suite.threshold ?? 0.9,
        durationMs: result.durationMs,
        details: [result.stdout || result.stderr].filter(Boolean),
        rawOutput,
      };
    });
  }

  private async runBehavioralCase(testCase: BehavioralEvalCase): Promise<BehavioralCaseResult> {
    const roleTransitions: RoleTransition[] = [];
    const payloads = new Map<string, BehavioralRolePayload>();

    for (const role of ROLE_ORDER) {
      const payload = await this.runRole(role, testCase, payloads);
      payloads.set(role, payload);
      roleTransitions.push({
        role,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        summary: payload.summary,
        output: JSON.stringify(payload),
      });
    }

    const coderPayload = payloads.get('coder');
    const plannerPayload = payloads.get('planner');
    const trace: BehavioralExecutionTrace = {
      caseId: testCase.id,
      provider: this.behavioralProvider.name,
      requestedTools: [
        ...new Set([
          ...(plannerPayload?.requestedTools ?? []),
          ...(coderPayload?.requestedTools ?? []),
        ]),
      ],
      duplicateChecks: [
        ...new Set([
          ...(plannerPayload?.duplicateChecks ?? []),
          ...(coderPayload?.duplicateChecks ?? []),
        ]),
      ],
      sources: [...new Set([...(plannerPayload?.sources ?? []), ...(coderPayload?.sources ?? [])])],
      askUser: Boolean((plannerPayload?.askUser ?? false) || (coderPayload?.askUser ?? false)),
      response: coderPayload?.response ?? '',
      roleTransitions,
    };

    const assertionResults = testCase.assertions.map((assertion) =>
      this.evaluateAssertion(assertion, trace),
    );
    const criticalFailure = assertionResults.some((result) => result.critical && !result.passed);
    const score =
      assertionResults.length === 0
        ? 0
        : assertionResults.filter((result) => result.passed).length / assertionResults.length;

    return {
      id: testCase.id,
      name: testCase.name,
      category: testCase.category,
      passed: !criticalFailure && score === 1,
      score: Number(score.toFixed(4)),
      criticalFailure,
      assertionResults,
      trace,
    };
  }

  private async runRole(
    role: (typeof ROLE_ORDER)[number],
    testCase: BehavioralEvalCase,
    payloads: Map<string, BehavioralRolePayload>,
  ): Promise<BehavioralRolePayload> {
    const system = DEFAULT_POLICY_BUNDLE.roles[role];
    if (!system) {
      throw new Error(`Missing behavioral role prompt for ${role}.`);
    }
    const priorPayloads = Object.fromEntries(payloads.entries());
    const prompt = [
      'You are executing an agent-engine behavioral evaluation case.',
      `Role: ${role}`,
      'Return strict JSON with these fields:',
      '{"summary":string,"requestedTools":string[],"sources":string[],"duplicateChecks":string[],"askUser":boolean,"response":string,"findings":string[],"decision":"pass"|"fail"|"needs_review"}',
      `CASE_JSON:${JSON.stringify(testCase)}`,
      `PRIOR_ROLE_OUTPUTS:${JSON.stringify(priorPayloads)}`,
    ].join('\n');

    const response = await this.behavioralProvider.generateText({
      system,
      user: prompt,
    });

    return this.parseRolePayload(response.text);
  }

  private parseRolePayload(value: string): BehavioralRolePayload {
    const normalized = value
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/, '');
    const parsed = JSON.parse(normalized) as BehavioralRolePayload;

    return {
      summary: parsed.summary ?? 'No summary provided.',
      requestedTools: parsed.requestedTools ?? [],
      sources: parsed.sources ?? [],
      duplicateChecks: parsed.duplicateChecks ?? [],
      askUser: parsed.askUser ?? false,
      response: parsed.response ?? '',
      findings: parsed.findings ?? [],
      decision: parsed.decision ?? 'needs_review',
    };
  }

  private evaluateAssertion(
    assertion: BehavioralAssertion,
    trace: BehavioralExecutionTrace,
  ): BehavioralAssertionResult {
    const critical = Boolean(assertion.critical);

    switch (assertion.type) {
      case 'tool-required':
        return {
          assertion,
          critical,
          passed: trace.requestedTools.includes(assertion.tool),
          detail: `Requested tools: ${trace.requestedTools.join(', ') || 'none'}`,
        };
      case 'tool-optional':
        return {
          assertion,
          critical,
          passed: true,
          detail: `Optional tool ${assertion.tool} not required for pass/fail.`,
        };
      case 'sources-required':
        return {
          assertion,
          critical,
          passed: trace.sources.length >= assertion.minimum,
          detail: `Sources: ${trace.sources.length}`,
        };
      case 'source-domain-required':
        return {
          assertion,
          critical,
          passed: assertion.domains.every((domain) =>
            trace.sources.some((source) => source.toLowerCase().includes(domain.toLowerCase())),
          ),
          detail: `Sources: ${trace.sources.join(', ') || 'none'}`,
        };
      case 'response-must-include':
        return {
          assertion,
          critical,
          passed: assertion.values.every((value) =>
            trace.response.toLowerCase().includes(value.toLowerCase()),
          ),
          detail: trace.response,
        };
      case 'response-must-not-include':
        return {
          assertion,
          critical,
          passed: assertion.values.every(
            (value) => !trace.response.toLowerCase().includes(value.toLowerCase()),
          ),
          detail: trace.response,
        };
      case 'no-fabricated-urls':
        return {
          assertion,
          critical,
          passed:
            !/[a-z0-9.-]+\/fake-url/i.test(trace.response) &&
            !trace.sources.some((source) => /fake-url/i.test(source)),
          detail: `Response and sources checked for fabricated URLs.`,
        };
      case 'duplicate-check-required':
        return {
          assertion,
          critical,
          passed: assertion.checks.every((check) => trace.duplicateChecks.includes(check)),
          detail: `Duplicate checks: ${trace.duplicateChecks.join(', ') || 'none'}`,
        };
      case 'user-confirmation-required':
        return {
          assertion,
          critical,
          passed: trace.askUser,
          detail: trace.askUser
            ? 'User confirmation requested.'
            : 'No user confirmation requested.',
        };
      default:
        return {
          assertion,
          critical,
          passed: false,
          detail: 'Unknown assertion type.',
        };
    }
  }
}
