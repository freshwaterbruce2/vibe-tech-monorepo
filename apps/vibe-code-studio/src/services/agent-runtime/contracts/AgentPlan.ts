import { z } from 'zod';

export const AGENT_PLAN_SCHEMA_VERSION = 1 as const;

export const AGENT_ACTION_TYPES = [
  'read_file',
  'write_file',
  'edit_file',
  'delete_file',
  'create_directory',
  'search_codebase',
  'analyze_code',
  'refactor_code',
  'generate_code',
  'run_tests',
  'review_project',
  'browser_action',
  'custom',
] as const;

const actionSchema = z
  .object({
    type: z.enum(AGENT_ACTION_TYPES),
    params: z.record(z.string(), z.unknown()),
  })
  .strict()
  .superRefine((action, context) => {
    if (action.type !== 'search_codebase') return;

    const searchQuery = action.params['searchQuery'];
    const validString = typeof searchQuery === 'string' && searchQuery.trim().length > 0;
    const validStringList =
      Array.isArray(searchQuery) &&
      searchQuery.length > 0 &&
      searchQuery.every(query => typeof query === 'string' && query.trim().length > 0);
    if (!validString && !validStringList) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['params', 'searchQuery'],
        message: 'search_codebase requires a non-empty searchQuery string or string array',
      });
    }
  });

const stepSchema = z
  .object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    action: actionSchema,
    requiresApproval: z.boolean().optional(),
    maxRetries: z.number().int().min(0).max(3).optional(),
  })
  .strict();

export const agentPlanSchema = z
  .object({
    schemaVersion: z.literal(AGENT_PLAN_SCHEMA_VERSION),
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    reasoning: z.string().trim().min(1),
    steps: z.array(stepSchema).min(1).max(20),
    warnings: z.array(z.string()).optional(),
  })
  .strict();

export type StructuredAgentPlan = z.infer<typeof agentPlanSchema>;

export const AGENT_PLAN_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    schemaVersion: { type: 'integer', const: AGENT_PLAN_SCHEMA_VERSION },
    title: { type: 'string', minLength: 1 },
    description: { type: 'string', minLength: 1 },
    reasoning: { type: 'string', minLength: 1 },
    steps: {
      type: 'array',
      minItems: 1,
      maxItems: 20,
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string', minLength: 1 },
          description: { type: 'string', minLength: 1 },
          action: {
            type: 'object',
            additionalProperties: false,
            properties: {
              type: { type: 'string', enum: AGENT_ACTION_TYPES },
              params: {
                type: 'object',
                properties: {
                  filePath: { type: 'string', minLength: 1 },
                  path: { type: 'string', minLength: 1 },
                  content: { type: 'string' },
                  oldContent: { type: 'string' },
                  newContent: { type: 'string' },
                  description: { type: 'string', minLength: 1 },
                  codeSnippet: { type: 'string', minLength: 1 },
                  requirements: { type: 'string' },
                  targetLanguage: { type: 'string', minLength: 1 },
                  projectName: { type: 'string', minLength: 1 },
                  targets: {
                    type: 'array',
                    items: { type: 'string', minLength: 1 },
                  },
                  workspaceRoot: { type: 'string', minLength: 1 },
                  browserAction: { type: 'string', minLength: 1 },
                  url: { type: 'string', minLength: 1 },
                  selector: { type: 'string', minLength: 1 },
                  text: { type: 'string' },
                  searchQuery: {
                    anyOf: [
                      { type: 'string', minLength: 1 },
                      {
                        type: 'array',
                        minItems: 1,
                        items: { type: 'string', minLength: 1 },
                      },
                    ],
                  },
                },
              },
            },
            required: ['type', 'params'],
          },
          requiresApproval: { type: 'boolean' },
          maxRetries: { type: 'integer', minimum: 0, maximum: 3 },
        },
        required: ['title', 'description', 'action'],
      },
    },
    warnings: { type: 'array', items: { type: 'string' } },
  },
  required: ['schemaVersion', 'title', 'description', 'reasoning', 'steps'],
} as const;

export const SUBMIT_AGENT_PLAN_TOOL = {
  type: 'function' as const,
  function: {
    name: 'submit_agent_plan',
    description: 'Submit the complete schema-versioned execution plan for validation.',
    parameters: AGENT_PLAN_JSON_SCHEMA as unknown as Record<string, unknown>,
  },
};

/** Strips a markdown code-fence wrapper (```json ... ```) if the whole payload is fenced. */
function stripFenceWrapper(content: string): string {
  const text = content.trim();
  const fenced = text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/);
  return fenced?.[1] ? fenced[1].trim() : text;
}

/** Returns the first balanced top-level JSON object in text (string/escape aware), or null. */
function firstBalancedJsonObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/**
 * Parses the provider payload, salvaging the first balanced JSON object when the
 * model appends commentary or a stray fence after the JSON even in structured
 * mode (observed live with OpenRouter-served models; their own response-healing
 * feature exists because json_schema is not fully enforced by every model).
 * The strict Zod schema below remains the actual contract — this only rescues
 * benign wrapping, never malformed plans.
 */
function parseStructuredPayload(content: string): unknown {
  const text = stripFenceWrapper(content);
  try {
    return JSON.parse(text);
  } catch (error) {
    const candidate = firstBalancedJsonObject(text);
    if (candidate !== null) return JSON.parse(candidate);
    throw error;
  }
}

export function decodeStructuredAgentPlan(content: string): StructuredAgentPlan {
  if (!content.trim()) throw new Error('Provider returned an empty structured plan');
  let value: unknown;
  try {
    value = parseStructuredPayload(content);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Provider violated the agent_plan_v1 JSON contract: ${detail}`);
  }
  const result = agentPlanSchema.safeParse(value);
  if (!result.success) {
    const detail = result.error.issues
      .slice(0, 5)
      .map(issue => `${issue.path.join('.') || 'plan'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Provider violated the agent_plan_v1 schema: ${detail}`);
  }
  return result.data;
}
