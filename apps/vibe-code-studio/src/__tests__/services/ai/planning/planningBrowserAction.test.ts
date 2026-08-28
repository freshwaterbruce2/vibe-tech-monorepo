/**
 * Planning-layer coverage for the spec-11 browser_action type: the planner
 * prompt documents it and ResponseParser accepts it as a valid step action.
 */
import { describe, expect, it } from 'vitest';
import { buildPlanningPrompt } from '../../../../services/ai/planning/PromptBuilder';
import { parseTaskPlan } from '../../../../services/ai/planning/ResponseParser';
import type { PlanningContext } from '../../../../services/ai/planning/types';

function makeContext(overrides: Partial<PlanningContext> = {}): PlanningContext {
  return {
    userRequest: 'verify the settings page',
    workspaceRoot: '/ws',
    openFiles: [],
    currentFile: undefined,
    recentFiles: [],
    projectStructure: undefined,
    projectAnalysis: undefined,
    maxSteps: 5,
    allowDestructive: false,
    ...overrides,
  };
}

describe('PromptBuilder browser_action docs', () => {
  it('documents browser_action with its variants in the planning prompt', () => {
    const prompt = buildPlanningPrompt(makeContext());
    expect(prompt).toContain('browser_action');
    expect(prompt).toContain('"browserAction": "navigate"');
    expect(prompt).toContain('read_console');
    expect(prompt).toContain('permission');
  });

  it('renders the structure and analysis sections when provided', () => {
    const prompt = buildPlanningPrompt(
      makeContext({
        allowDestructive: true,
        openFiles: ['src/App.tsx'],
        currentFile: 'src/App.tsx',
        recentFiles: ['src/main.tsx'],
        projectAnalysis: 'ANALYSIS SUMMARY',
        projectStructure: {
          type: 'react',
          detectedFramework: 'vite',
          entryPoints: ['src/main.tsx', 'src/App.tsx'],
          configFiles: ['vite.config.ts'],
        },
      })
    );
    expect(prompt).toContain('PROJECT STRUCTURE DETECTED');
    expect(prompt).toContain('react (vite)');
    expect(prompt).toContain('main.tsx');
    expect(prompt).toContain('vite.config.ts');
    expect(prompt).toContain('ANALYSIS SUMMARY');
  });

  it('handles a structure without entry points or framework', () => {
    const prompt = buildPlanningPrompt(
      makeContext({
        projectStructure: { type: 'node', entryPoints: [], configFiles: [] },
      })
    );
    expect(prompt).toContain('Entry Points: Not detected');
    expect(prompt).toContain('Config Files: None');
  });
});

describe('ResponseParser browser_action validation', () => {
  it('accepts browser_action steps as valid', () => {
    const response = JSON.stringify({
      title: 'Verify UI',
      description: 'Open the app and screenshot it',
      reasoning: 'verify',
      steps: [
        {
          order: 1,
          title: 'Open app',
          description: 'Navigate to the dev server',
          action: {
            type: 'browser_action',
            params: { browserAction: 'navigate', url: 'http://localhost:5173/' },
          },
          requiresApproval: false,
          maxRetries: 1,
        },
      ],
    });
    const task = parseTaskPlan(response, 'verify the app');
    expect(task.steps).toHaveLength(1);
    expect(task.steps[0]?.action.type).toBe('browser_action');
    expect(task.steps[0]?.action.params['browserAction']).toBe('navigate');
  });
});
