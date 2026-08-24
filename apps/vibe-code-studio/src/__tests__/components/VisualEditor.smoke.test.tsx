import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const handleAddElement = vi.fn();
const handleSelectElement = vi.fn();
const handleDeleteElement = vi.fn();
const handleUpdateProperty = vi.fn();
const handleGenerateCode = vi.fn();

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="dnd">{children}</div>
  ),
  DragOverlay: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  closestCenter: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
  PointerSensor: class {},
  KeyboardSensor: class {},
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  }),
  verticalListSortingStrategy: {},
  arrayMove: (a: unknown[]) => a,
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => undefined } },
}));

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  },
}));

vi.mock('../../components/VisualEditor/styled', () => {
  const Passthrough = ({
    children,
    onClick,
    ...rest
  }: {
    children?: React.ReactNode;
    onClick?: (e: React.MouseEvent) => void;
  }) => (
    <div onClick={onClick} {...rest}>
      {children}
    </div>
  );
  return {
    Canvas: Passthrough,
    CanvasContent: Passthrough,
    DropZone: Passthrough,
    EditorContainer: Passthrough,
    EmptyState: Passthrough,
    IconButton: ({
      children,
      onClick,
    }: {
      children?: React.ReactNode;
      onClick?: (e: React.MouseEvent) => void;
    }) => (
      <button type="button" onClick={onClick}>
        {children}
      </button>
    ),
    Input: (p: React.InputHTMLAttributes<HTMLInputElement>) => <input {...p} />,
    ItemActions: Passthrough,
    Label: Passthrough,
    Palette: Passthrough,
    PaletteItem: Passthrough,
    PaletteSection: Passthrough,
    PaletteTitle: Passthrough,
    PropertiesPanel: Passthrough,
    PropertyGroup: Passthrough,
    SortableItemStyled: Passthrough,
    Toolbar: Passthrough,
    ToolbarButton: ({
      children,
      onClick,
    }: {
      children?: React.ReactNode;
      onClick?: () => void;
    }) => (
      <button type="button" onClick={onClick}>
        {children}
      </button>
    ),
  };
});

vi.mock('../../components/VisualEditor/useVisualEditor', () => ({
  useVisualEditor: () => ({
    elements: [
      {
        id: 'e1',
        type: 'button',
        props: { text: 'Go' },
      },
    ],
    activeId: 'e1',
    selectedElementId: 'e1',
    sensors: [],
    handleDragStart: vi.fn(),
    handleDragEnd: vi.fn(),
    handleAddElement,
    handleSelectElement,
    handleDeleteElement,
    handleUpdateProperty,
    handleGenerateCode,
  }),
}));

import { VisualEditor } from '../../components/VisualEditor/VisualEditor';

describe('VisualEditor smoke', () => {
  it('mounts with elements and exercises palette/select/delete', () => {
    render(<VisualEditor onCodeGenerated={vi.fn()} />);
    // Palette items from utils
    fireEvent.click(screen.getByText('Button'));
    expect(handleAddElement).toHaveBeenCalled();

    // Click canvas element (may appear more than once in overlay)
    fireEvent.click(screen.getAllByText('Go')[0]!);
    expect(handleSelectElement).toHaveBeenCalled();

    // Canvas clear-selection path
    fireEvent.click(screen.getByTestId('dnd').parentElement ?? screen.getByTestId('dnd'));

    // Property update for selected element
    const propInput = screen.getByDisplayValue('Go');
    fireEvent.change(propInput, { target: { value: 'Run' } });
    expect(handleUpdateProperty).toHaveBeenCalledWith('text', 'Run');

    // Delete via ✕
    const del = screen.getAllByText('✕')[0]!;
    fireEvent.click(del);
    expect(handleDeleteElement).toHaveBeenCalled();
  });
});
