import { render, screen, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

type EventCallback = (event: { payload: unknown }) => void;
const listeners: EventCallback[] = [];

vi.mock('@tauri-apps/api/event', () => ({
  listen: vi.fn(async (_: string, cb: EventCallback) => {
    listeners.push(cb);
    return () => {
      const i = listeners.indexOf(cb);
      if (i >= 0) listeners.splice(i, 1);
    };
  }),
}));

import { App } from '../App';

describe('App', () => {
  beforeEach(() => {
    listeners.length = 0;
  });

  it('renders idle status initially', () => {
    render(<App />);
    expect(screen.getByTestId('status')).toHaveTextContent('Idle');
  });

  it('updates status from backend events', () => {
    render(<App />);
    act(() => {
      listeners.forEach((cb) => cb({ payload: { status: 'listening' } }));
    });
    expect(screen.getByTestId('status')).toHaveTextContent('Listening…');
  });

  it('ignores malformed event payloads', () => {
    render(<App />);
    act(() => {
      listeners.forEach((cb) => cb({ payload: { status: 'bogus' } }));
    });
    expect(screen.getByTestId('status')).toHaveTextContent('Idle');
  });
});
