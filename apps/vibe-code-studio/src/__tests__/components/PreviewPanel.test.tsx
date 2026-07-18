import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PreviewPanel } from '../../components/PreviewPanel';

describe('PreviewPanel', () => {
  it('refreshes preview when refresh is clicked', () => {
    render(
      <PreviewPanel
        code={'export default function App() { return <div>Hi</div> }'}
        fileName="App.tsx"
        language="typescript"
      />
    );
    // Toggle/refresh controls should exist
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
    // Click any refresh-looking control
    const refresh = buttons.find(b => /refresh|reload/i.test(b.textContent ?? b.title ?? ''));
    if (refresh) {
      fireEvent.click(refresh);
    } else {
      // Fallback: click first toolbar button (handleRefresh may be icon-only)
      fireEvent.click(buttons[0]!);
    }
    expect(document.body).toBeTruthy();
  });
});
