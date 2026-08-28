/**
 * ArtifactViewer plan-kind tests — spec 05: plan artifacts render through the
 * sanitized MarkdownContent viewer; other markdown kinds (task_list) keep the
 * preformatted fallback.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ArtifactViewer } from '../../components/ArtifactsPanel/ArtifactViewer';
import type { Artifact } from '../../services/artifacts/types';

function artifact(overrides: Partial<Artifact>): Artifact {
  return {
    id: 'a-1',
    taskId: 'task-1',
    kind: 'plan',
    title: 'Plan: refactor login',
    content: '# Refactor Login\n\n- [ ] 1. Edit `src/a.ts`',
    createdAt: new Date(1000).toISOString(),
    updatedAt: new Date(1000).toISOString(),
    status: 'final',
    ...overrides,
  };
}

const noop = () => undefined;

describe('ArtifactViewer — plan kind', () => {
  it('renders plan artifacts through MarkdownContent', () => {
    render(<ArtifactViewer artifact={artifact({})} onClose={noop} />);
    const view = screen.getByTestId('artifact-viewer-plan');
    expect(view.querySelector('[data-testid="markdown-content"]')).toBeTruthy();
    expect(view.querySelector('h1')?.textContent).toBe('Refactor Login');
    expect(screen.queryByTestId('artifact-viewer-markdown')).toBeNull();
  });

  it('keeps non-plan markdown kinds preformatted', () => {
    const taskList = artifact({ kind: 'task_list', content: '# Task list\n- raw' });
    render(<ArtifactViewer artifact={taskList} onClose={noop} />);
    const view = screen.getByTestId('artifact-viewer-markdown');
    expect(view.textContent).toContain('# Task list');
    expect(view.querySelector('h1')).toBeNull();
    expect(screen.queryByTestId('artifact-viewer-plan')).toBeNull();
  });
});
