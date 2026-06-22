/**
 * useVisualEditor Hook
 * Manages drag-and-drop state and element operations
 */
import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';

import type { UIElement, VisualEditorState } from './types';
import { generateCode, getDefaultProps } from './utils';

export interface UseVisualEditorReturn {
  elements: VisualEditorState['elements'];
  activeId: VisualEditorState['activeId'];
  selectedElementId: string | null;
  sensors: ReturnType<typeof useDndSensors>;
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  handleAddElement: (type: UIElement['type']) => void;
  handleSelectElement: (id: string) => void;
  handleDeleteElement: (id: string) => void;
  handleUpdateProperty: (key: string, value: unknown) => void;
  handleGenerateCode: () => void;
}

// Separate hook for sensors to avoid hook call in function
function useDndSensors() {
  return useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
}

interface VisualEditorHandlerDeps {
  selectedElement: string | null;
  setElements: Dispatch<SetStateAction<UIElement[]>>;
  setActiveId: Dispatch<SetStateAction<string | null>>;
  setSelectedElement: Dispatch<SetStateAction<string | null>>;
}

function useDragHandlers(
  setActiveId: VisualEditorHandlerDeps['setActiveId'],
  setElements: VisualEditorHandlerDeps['setElements']
) {
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, [setActiveId]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setElements((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }, [setActiveId, setElements]);

  return { handleDragStart, handleDragEnd };
}

function useVisualEditorHandlers(deps: VisualEditorHandlerDeps) {
  const {
    selectedElement,
    setElements,
    setActiveId,
    setSelectedElement,
  } = deps;

  const { handleDragStart, handleDragEnd } = useDragHandlers(setActiveId, setElements);

  const handleAddElement = useCallback((type: UIElement['type']) => {
    const newElement: UIElement = {
      id: `element-${Date.now()}`,
      type,
      props: getDefaultProps(type),
    };
    setElements((prev) => [...prev, newElement]);
    setSelectedElement(newElement.id);
  }, [setElements, setSelectedElement]);

  const handleSelectElement = useCallback((id: string) => {
    setSelectedElement(id);
  }, [setSelectedElement]);

  const handleDeleteElement = useCallback((id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id));
    if (selectedElement === id) {
      setSelectedElement(null);
    }
  }, [selectedElement, setElements, setSelectedElement]);

  const handleUpdateProperty = useCallback((key: string, value: unknown) => {
    if (!selectedElement) {return;}
    setElements((prev) =>
      prev.map((el) =>
        el.id === selectedElement
          ? { ...el, props: { ...el.props, [key]: value } }
          : el
      )
    );
  }, [selectedElement, setElements]);

  return {
    handleDragStart,
    handleDragEnd,
    handleAddElement,
    handleSelectElement,
    handleDeleteElement,
    handleUpdateProperty,
  };
}

export function useVisualEditor(
  onCodeGenerated?: (elements: UIElement[], code: string) => void
): UseVisualEditorReturn {
  const [elements, setElements] = useState<UIElement[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);

  const sensors = useDndSensors();

  const {
    handleDragStart,
    handleDragEnd,
    handleAddElement,
    handleSelectElement,
    handleDeleteElement,
    handleUpdateProperty,
  } = useVisualEditorHandlers({
    selectedElement,
    setElements,
    setActiveId,
    setSelectedElement,
  });

  const handleGenerateCode = useCallback(() => {
    const code = generateCode(elements);
    if (onCodeGenerated) {
      onCodeGenerated(elements, code);
    }
  }, [elements, onCodeGenerated]);

  return {
    elements,
    activeId,
    selectedElementId: selectedElement,
    sensors,
    handleDragStart,
    handleDragEnd,
    handleAddElement,
    handleSelectElement,
    handleDeleteElement,
    handleUpdateProperty,
    handleGenerateCode,
  };
}
