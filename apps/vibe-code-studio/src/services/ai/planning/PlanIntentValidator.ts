import type { StructuredAgentPlan } from '../../agent-runtime/contracts/AgentPlan';

const MUTATION_ACTIONS = new Set(['write_file', 'edit_file', 'generate_code']);
const MUTATION_INTENT = /\b(create|restore|repair|fix|update|edit|replace|rewrite)\b/gi;
const MUTATION_LANGUAGE = /\b(create|restore|repair|fix|update|edit|replace|rewrite)\b/i;
const INSPECTION_INTENT = /\b(inspect|read|review|analyze|check|search|find)\b/gi;
const FILE_PATH = /(?:^|[\s"'`(\[])([\w./\\-]+\.[a-z0-9]+)(?=$|[\s"'`)\],;:!? .])/gi;
const HARD_CLAUSE_BOUNDARY = /[\r\n;!?]|[.](?=\s|$)/;
const NEGATED_MUTATION = /\b(?:do\s+not|don't|never|avoid|without)\s*$/i;

const normalizePath = (value: string): string => value.replace(/\\/g, '/').toLowerCase();

type IntentEvent = {
  end: number;
  index: number;
  kind: 'inspection' | 'mutation' | 'path';
  value: string;
};

type InspectionRequirement =
  | { kind: 'file'; value: string }
  | { kind: 'instructions' }
  | { kind: 'exports' }
  | { kind: 'conventions' };

function collectEvents(userRequest: string): IntentEvent[] {
  const intentEvents = [
    ...[...userRequest.matchAll(MUTATION_INTENT)].map(match => ({
      end: match.index + match[0].length,
      index: match.index,
      kind: 'mutation' as const,
      value: match[0],
    })),
    ...[...userRequest.matchAll(INSPECTION_INTENT)].map(match => ({
      end: match.index + match[0].length,
      index: match.index,
      kind: 'inspection' as const,
      value: match[0],
    })),
  ];
  const pathEvents = [...userRequest.matchAll(FILE_PATH)]
    .filter(match => Boolean(match[1]))
    .map(match => ({
      end: match.index + match[0].length,
      index: match.index,
      kind: 'path' as const,
      value: match[1]!,
    }));
  return [...intentEvents, ...pathEvents].sort((left, right) => left.index - right.index);
}

function extractExplicitMutationPaths(userRequest: string): string[] {
  const requestedPaths: string[] = [];
  let governingIntent: 'inspection' | 'mutation' | undefined;
  let previousEnd = 0;

  for (const event of collectEvents(userRequest)) {
    if (HARD_CLAUSE_BOUNDARY.test(userRequest.slice(previousEnd, event.index))) {
      governingIntent = undefined;
    }
    if (event.kind === 'mutation') {
      const prefix = userRequest.slice(Math.max(0, event.index - 24), event.index);
      governingIntent = NEGATED_MUTATION.test(prefix) ? 'inspection' : 'mutation';
    } else if (event.kind === 'inspection') {
      governingIntent = 'inspection';
    } else if (governingIntent === 'mutation') {
      requestedPaths.push(normalizePath(event.value));
    }
    previousEnd = Math.max(previousEnd, event.end);
  }

  return [...new Set(requestedPaths)];
}

function extractExplicitInspectionPaths(userRequest: string): string[] {
  const requestedPaths: string[] = [];
  let governingIntent: 'inspection' | 'mutation' | undefined;
  let previousEnd = 0;

  for (const event of collectEvents(userRequest)) {
    if (HARD_CLAUSE_BOUNDARY.test(userRequest.slice(previousEnd, event.index))) {
      governingIntent = undefined;
    }
    if (event.kind === 'mutation') governingIntent = 'mutation';
    else if (event.kind === 'inspection') governingIntent = 'inspection';
    else if (governingIntent === 'inspection') requestedPaths.push(normalizePath(event.value));
    previousEnd = Math.max(previousEnd, event.end);
  }
  return [...new Set(requestedPaths)];
}

function inspectionRequirements(userRequest: string): InspectionRequirement[] {
  const requirements: InspectionRequirement[] = extractExplicitInspectionPaths(userRequest).map(
    value => ({ kind: 'file' as const, value })
  );
  const mutationPaths = extractExplicitMutationPaths(userRequest);
  if (mutationPaths.length === 1 && /\b(?:existing\s+)?exports?\b/i.test(userRequest)) {
    requirements.push({ kind: 'file', value: mutationPaths[0]! });
  }
  if (/\b(?:nearest\s+)?instructions?\b/i.test(userRequest)) {
    requirements.push({ kind: 'instructions' });
  }
  if (/\b(?:existing\s+)?exports?\b/i.test(userRequest)) {
    requirements.push({ kind: 'exports' });
  }
  if (/\b(?:entry[- ]?point\s+)?conventions?\b/i.test(userRequest)) {
    requirements.push({ kind: 'conventions' });
  }
  return requirements.filter(
    (requirement, index, all) =>
      all.findIndex(candidate => JSON.stringify(candidate) === JSON.stringify(requirement)) ===
      index
  );
}

function inspectionText(step: StructuredAgentPlan['steps'][number]): string {
  const query = step.action.params['searchQuery'];
  return Array.isArray(query)
    ? query
        .filter(value => typeof value === 'string')
        .join(' ')
        .toLowerCase()
    : typeof query === 'string'
      ? query.toLowerCase()
      : '';
}

function coversInspection(plan: StructuredAgentPlan, requirement: InspectionRequirement): boolean {
  return plan.steps.some(step => {
    if (!['read_file', 'analyze_code', 'search_codebase'].includes(step.action.type)) return false;
    if (requirement.kind === 'file') {
      const filePath = step.action.params['filePath'];
      return (
        typeof filePath === 'string' &&
        (normalizePath(filePath) === requirement.value ||
          normalizePath(filePath).endsWith(`/${requirement.value}`))
      );
    }
    const text = inspectionText(step);
    if (requirement.kind === 'instructions') return /\bagents?\.md\b|\binstructions?\b/.test(text);
    if (requirement.kind === 'exports') return /\bexports?\b/.test(text);
    return /\bconventions?\b|\bentry[- ]?point\b|\bmcpserver\b|\bsibling\b/.test(text);
  });
}

function stepForRequirement(
  requirement: InspectionRequirement
): StructuredAgentPlan['steps'][number] {
  if (requirement.kind === 'file') {
    return {
      title: `Inspect ${requirement.value}`,
      description: `Read the explicitly requested file ${requirement.value}.`,
      action: { type: 'read_file', params: { filePath: requirement.value } },
      requiresApproval: false,
    };
  }
  const details = {
    instructions: ['nearest instructions', 'AGENTS.md'],
    exports: ['existing exports', 'export'],
    conventions: ['entry-point conventions', 'entry point', 'McpServer', 'sibling'],
  } as const;
  const [label, ...searchQuery] = details[requirement.kind];
  return {
    title: `Inspect ${label}`,
    description: `Search the workspace for ${label}.`,
    action: { type: 'search_codebase', params: { searchQuery } },
    requiresApproval: false,
  };
}

export function bindFinalAttemptInspectionRequirements(
  plan: StructuredAgentPlan,
  userRequest: string
): StructuredAgentPlan {
  const missing = inspectionRequirements(userRequest).filter(
    requirement => !coversInspection(plan, requirement)
  );
  if (missing.length === 0 || plan.steps.length + missing.length > 20) return plan;
  const insertion = plan.steps.findIndex(step => MUTATION_ACTIONS.has(step.action.type));
  const index = insertion < 0 ? plan.steps.length : insertion;
  return {
    ...plan,
    steps: [
      ...plan.steps.slice(0, index),
      ...missing.map(stepForRequirement),
      ...plan.steps.slice(index),
    ],
  };
}

export function bindFinalAttemptRuntimeParams(plan: StructuredAgentPlan): StructuredAgentPlan {
  return {
    ...plan,
    steps: plan.steps.map(step => {
      if (step.action.type !== 'generate_code') return step;
      const description = step.action.params['description'];
      if (typeof description === 'string' && description.trim()) return step;
      return {
        ...step,
        action: {
          ...step.action,
          params: { ...step.action.params, description: step.description },
        },
      };
    }),
  };
}

export function validateExplicitInspectionIntent(
  plan: StructuredAgentPlan,
  userRequest: string
): void {
  const missing = inspectionRequirements(userRequest).filter(
    requirement => !coversInspection(plan, requirement)
  );
  if (missing.length === 0) return;
  const labels = missing.map(requirement =>
    requirement.kind === 'file' ? requirement.value : requirement.kind
  );
  throw new Error(
    `The request explicitly requires inspecting ${labels.join(', ')}, but the plan has no ` +
      'matching read_file, analyze_code, or search_codebase action'
  );
}

export function bindFinalAttemptMutationTarget(
  plan: StructuredAgentPlan,
  userRequest: string
): StructuredAgentPlan {
  const requestedPaths = extractExplicitMutationPaths(userRequest);
  if (requestedPaths.length !== 1) return plan;
  const requestedPath = requestedPaths[0]!;
  const alreadyTargeted = plan.steps.some(step => {
    const filePath = step.action.params['filePath'];
    return MUTATION_ACTIONS.has(step.action.type) && typeof filePath === 'string';
  });
  if (alreadyTargeted) return plan;

  const candidates = plan.steps
    .map((step, index) => ({ index, step }))
    .filter(({ index, step }) => {
      if (index !== plan.steps.length - 1 || step.action.type !== 'generate_code') return false;
      if (typeof step.action.params['filePath'] === 'string') return false;
      const description = step.action.params['description'];
      const language = [
        step.title,
        step.description,
        typeof description === 'string' ? description : '',
      ].join(' ');
      return MUTATION_LANGUAGE.test(language) && normalizePath(language).includes(requestedPath);
    });
  if (candidates.length !== 1) return plan;

  const candidateIndex = candidates[0]!.index;
  return {
    ...plan,
    steps: plan.steps.map((step, index) =>
      index === candidateIndex
        ? {
            ...step,
            action: {
              ...step.action,
              params: { ...step.action.params, filePath: requestedPath },
            },
          }
        : step
    ),
  };
}

export function validateExplicitMutationIntent(
  plan: StructuredAgentPlan,
  userRequest: string
): void {
  const requestedPaths = extractExplicitMutationPaths(userRequest);
  if (requestedPaths.length === 0) return;

  const mutationPaths = plan.steps
    .filter(step => MUTATION_ACTIONS.has(step.action.type))
    .map(step => step.action.params['filePath'])
    .filter((path): path is string => typeof path === 'string' && path.trim().length > 0)
    .map(normalizePath);
  const missingPaths = requestedPaths.filter(
    requested =>
      !mutationPaths.some(target => target === requested || target.endsWith(`/${requested}`))
  );
  if (missingPaths.length > 0) {
    throw new Error(
      `The request explicitly requires mutating ${missingPaths.join(', ')}, but the plan has ` +
        'no write_file, edit_file, or generate_code action with a matching filePath'
    );
  }
}
