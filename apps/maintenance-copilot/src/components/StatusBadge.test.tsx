// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from './StatusBadge';
import { toneClass } from '../lib/tone';

describe('toneClass', () => {
  it.each([
    ['ok', 'ok'],
    ['warn', 'warnText'],
    ['danger', 'danger'],
    ['info', 'muted'],
  ] as const)('maps tone %s -> .%s', (tone, cls) => {
    expect(toneClass(tone)).toBe(cls);
  });
});

describe('StatusBadge', () => {
  it('renders children with the toned badge class', () => {
    const { container } = render(<StatusBadge tone="danger">integrity failed</StatusBadge>);
    expect(screen.getByText(/integrity failed/)).toBeInTheDocument();
    expect(container.querySelector('.badge')?.className).toContain('danger');
  });
});
