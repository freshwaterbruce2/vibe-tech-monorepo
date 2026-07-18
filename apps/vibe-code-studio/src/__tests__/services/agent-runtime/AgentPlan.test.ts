import { describe, expect, it } from 'vitest';

import {
  AGENT_PLAN_JSON_SCHEMA,
  decodeStructuredAgentPlan,
} from '../../../services/agent-runtime/contracts/AgentPlan';

const validPlan = {
  schemaVersion: 1,
  title: 'Inspect project',
  description: 'Inspect before changing anything',
  reasoning: 'Project evidence is required first',
  steps: [
    {
      title: 'Read package manifest',
      description: 'Read the existing package configuration',
      action: { type: 'read_file', params: { filePath: 'package.json' } },
    },
  ],
};

describe('agent_plan_v1 contract', () => {
  it('decodes a valid schema-versioned plan', () => {
    expect(decodeStructuredAgentPlan(JSON.stringify(validPlan))).toEqual(validPlan);
  });

  it.each(['', '{"schemaVersion":1', '```json\n{}\n```'])(
    'rejects empty or malformed provider output',
    content => {
      expect(() => decodeStructuredAgentPlan(content)).toThrow();
    }
  );

  it('rejects missing fields and unrecognized properties', () => {
    expect(() =>
      decodeStructuredAgentPlan(JSON.stringify({ ...validPlan, surprise: true }))
    ).toThrow(/schema/);
    expect(() => decodeStructuredAgentPlan(JSON.stringify({ ...validPlan, steps: [] }))).toThrow(
      /steps/
    );
  });

  it.each(['run_command', 'git_commit'])('rejects the unsafe %s mutation bypass', type => {
    const plan = {
      ...validPlan,
      steps: [{ ...validPlan.steps[0], action: { type, params: {} } }],
    };
    expect(() => decodeStructuredAgentPlan(JSON.stringify(plan))).toThrow(/schema/);
  });

  it.each([undefined, '', '   ', [], ['TODO', '']])(
    'rejects an empty search_codebase query (%j)',
    searchQuery => {
      const plan = {
        ...validPlan,
        steps: [
          {
            ...validPlan.steps[0],
            action: { type: 'search_codebase', params: { searchQuery } },
          },
        ],
      };
      expect(() => decodeStructuredAgentPlan(JSON.stringify(plan))).toThrow(
        /non-empty searchQuery/
      );
    }
  );

  it.each(['TODO', ['asset', 'image']])('accepts a populated search query (%j)', searchQuery => {
    const plan = {
      ...validPlan,
      steps: [
        {
          ...validPlan.steps[0],
          action: { type: 'search_codebase', params: { searchQuery } },
        },
      ],
    };
    expect(decodeStructuredAgentPlan(JSON.stringify(plan)).steps[0]?.action.params).toEqual({
      searchQuery,
    });
  });

  it('publishes a strict JSON Schema matching the runtime version', () => {
    expect(AGENT_PLAN_JSON_SCHEMA).toMatchObject({
      additionalProperties: false,
      properties: { schemaVersion: { const: 1 } },
      required: expect.arrayContaining(['schemaVersion', 'steps']),
    });
  });

  describe('payload salvage (providers violating structured mode)', () => {
    const planJson = JSON.stringify(validPlan);

    it('decodes a plan wrapped in a markdown fence', () => {
      expect(decodeStructuredAgentPlan('```json\n' + planJson + '\n```')).toEqual(validPlan);
    });

    it('decodes a plan with trailing commentary after the JSON', () => {
      const content = planJson + '\n\nThis plan inspects the project before editing.';
      expect(decodeStructuredAgentPlan(content)).toEqual(validPlan);
    });

    it('decodes a plan with a stray trailing fence (live failure shape)', () => {
      expect(decodeStructuredAgentPlan(planJson + '\n```\n')).toEqual(validPlan);
    });

    it('decodes a plan preceded by prose', () => {
      expect(decodeStructuredAgentPlan('Here is the plan:\n' + planJson)).toEqual(validPlan);
    });

    it('takes the first plan when two JSON objects are concatenated', () => {
      const second = JSON.stringify({ ...validPlan, title: 'Second copy' });
      expect(decodeStructuredAgentPlan(planJson + '\n' + second)).toEqual(validPlan);
    });

    it('is not confused by braces inside JSON strings', () => {
      const tricky = {
        ...validPlan,
        description: 'Handles { nested } and "quoted } brace" text',
      };
      expect(decodeStructuredAgentPlan(JSON.stringify(tricky) + ' extra')).toEqual(tricky);
    });

    it('still rejects prose with no JSON object', () => {
      expect(() => decodeStructuredAgentPlan('I could not produce a plan.')).toThrow(
        /agent_plan_v1 JSON contract/
      );
    });

    it('still rejects a truncated JSON object', () => {
      expect(() => decodeStructuredAgentPlan(planJson.slice(0, 40))).toThrow(
        /agent_plan_v1 JSON contract/
      );
    });
  });
});
