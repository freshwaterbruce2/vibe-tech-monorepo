import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...p }: { children?: React.ReactNode }) => <div {...p}>{children}</div>,
  },
}));

const setSearchQuery = vi.fn();
const openPreview = vi.fn();
const handleCopy = vi.fn();
const handleInsert = vi.fn();
const closePreview = vi.fn();

const sample = {
  id: 'btn',
  name: 'Button',
  description: 'A button',
  category: 'form',
  tags: ['ui'],
  code: '<button />',
  popular: true,
};

vi.mock('../../components/ComponentLibrary/useComponentLibrary', () => ({
  useComponentLibrary: () => ({
    searchQuery: '',
    setSearchQuery,
    selectedComponent: sample,
    copiedId: 'btn',
    groupedComponents: { form: [sample] },
    handleCopy,
    handleInsert,
    openPreview,
    closePreview,
  }),
}));

import { ComponentLibrary } from '../../components/ComponentLibrary/ComponentLibrary';

describe('ComponentLibrary smoke', () => {
  it('renders and exercises search/actions/preview', () => {
    render(<ComponentLibrary onInsertComponent={vi.fn()} />);
    expect(screen.getByText('Component Library')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search components...'), {
      target: { value: 'btn' },
    });
    expect(setSearchQuery).toHaveBeenCalled();

    fireEvent.click(screen.getByText('View'));
    expect(openPreview).toHaveBeenCalledWith(sample);

    // Copy (Check icon path when copiedId matches)
    const buttons = screen.getAllByRole('button');
    buttons.forEach(b => fireEvent.click(b));
    expect(handleCopy).toHaveBeenCalled();
    expect(handleInsert).toHaveBeenCalled();

    // Preview modal close via overlay / Close
    fireEvent.click(screen.getByText('Close'));
    expect(closePreview).toHaveBeenCalled();
  });
});
