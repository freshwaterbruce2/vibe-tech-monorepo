/**
 * Planning PromptBuilder — AGENTS.md standards injection (spec 03).
 *
 * Covers the `agentStandards` destructure, the `standardsSection` trim/falsy
 * branches, and the interpolation into the planning prompt's workspace block.
 */

import { describe, expect, it } from 'vitest';
import { buildPlanningPrompt } from '../../../services/ai/planning/PromptBuilder';
import type { PlanningContext } from '../../../services/ai/planning/types';

const STANDARDS_HEADER = 'PROJECT AGENT STANDARDS (AGENTS.md):';

const STANDARDS_SECTION = [
  '',
  '',
  STANDARDS_HEADER,
  'Sections are ordered root-first; on conflict the LATER (closest) section wins.',
  '<!-- source: C:/ws/AGENTS.md -->',
  'Use pnpm only. Never npm.',
  '',
].join('\n');

const makeContext = (overrides: Partial<PlanningContext> = {}): PlanningContext => ({
  userRequest: 'Refactor the login form',
  workspaceRoot: 'C:/ws',
  openFiles: ['C:/ws/src/App.tsx'],
  currentFile: 'C:/ws/src/App.tsx',
  recentFiles: ['C:/ws/src/main.tsx'],
  projectStructure: undefined,
  projectAnalysis: undefined,
  maxSteps: 5,
  allowDestructive: false,
  ...overrides,
});

describe('buildPlanningPrompt — agentStandards section', () => {
  it('injects a non-empty standards section into the workspace context block', () => {
    const prompt = buildPlanningPrompt(makeContext({ agentStandards: STANDARDS_SECTION }));

    expect(prompt).toContain(STANDARDS_HEADER);
    expect(prompt).toContain('<!-- source: C:/ws/AGENTS.md -->');
    expect(prompt).toContain('Use pnpm only. Never npm.');
    // Interpolated after the workspace context lines, before the behavior rules.
    const headerIdx = prompt.indexOf(STANDARDS_HEADER);
    expect(headerIdx).toBeGreaterThan(prompt.indexOf('- Recent Files:'));
    expect(headerIdx).toBeLessThan(prompt.indexOf('AUTONOMOUS BEHAVIOR RULES'));
  });

  it('trims surrounding whitespace from the standards content before injecting', () => {
    const prompt = buildPlanningPrompt(
      makeContext({ agentStandards: `\n\n${STANDARDS_HEADER}\nbody line\n\n` })
    );
    expect(prompt).toContain(`\n${STANDARDS_HEADER}\nbody line\n`);
  });

  it('omits the section when agentStandards is undefined', () => {
    const prompt = buildPlanningPrompt(makeContext({ agentStandards: undefined }));
    expect(prompt).not.toContain(STANDARDS_HEADER);
  });

  it('omits the section when agentStandards is whitespace-only (trim-falsy branch)', () => {
    const withWhitespace = buildPlanningPrompt(makeContext({ agentStandards: '   ' }));
    const withUndefined = buildPlanningPrompt(makeContext({ agentStandards: undefined }));

    expect(withWhitespace).not.toContain(STANDARDS_HEADER);
    // Whitespace-only standards must produce the exact same prompt as none at all.
    expect(withWhitespace).toBe(withUndefined);
  });

  it('renders standards alongside projectStructure and projectAnalysis sections', () => {
    const prompt = buildPlanningPrompt(
      makeContext({
        agentStandards: STANDARDS_SECTION,
        projectStructure: {
          type: 'react',
          detectedFramework: 'vite',
          entryPoints: ['C:/ws/src/main.tsx'],
          configFiles: ['C:/ws/package.json'],
        },
        projectAnalysis: '=== PROJECT ANALYSIS ===\nReact app\n=== END ANALYSIS ===',
      })
    );

    expect(prompt).toContain('PROJECT STRUCTURE DETECTED:');
    expect(prompt).toContain('=== PROJECT ANALYSIS ===');
    expect(prompt).toContain(STANDARDS_HEADER);
    // Standards come after the analysis section in the same interpolation chain.
    expect(prompt.indexOf(STANDARDS_HEADER)).toBeGreaterThan(
      prompt.indexOf('=== END ANALYSIS ===')
    );
  });
});
