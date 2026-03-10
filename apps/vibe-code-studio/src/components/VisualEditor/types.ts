/**
 * VisualEditor Types
 */

export interface UIElement {
  id: string;
  type: 'button' | 'input' | 'text' | 'card' | 'container';
  props: Record<string, unknown>;
}

export interface VisualEditorProps {
  onSave?: (elements: UIElement[], code: string) => void;
  onCodeGenerated?: (elements: UIElement[], code: string) => void;
}

export interface SortableElementProps {
  element: UIElement;
  onDelete: (id: string) => void;
  onSelect: (id: string) => void;
  isSelected: boolean;
}

export interface PaletteItem {
  type: UIElement['type'];
  label: string;
  icon: string;
}

export interface VisualEditorState {
  elements: UIElement[];
  activeId: string | null;
  selectedElementId: string | null;
}
