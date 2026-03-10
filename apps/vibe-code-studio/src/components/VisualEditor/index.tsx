/**
 * VisualEditor Component
 * Drag-and-drop visual UI builder for component creation
 */
import { closestCenter, DndContext, DragOverlay } from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AnimatePresence, motion } from 'framer-motion';
import {
    Canvas,
    CanvasContent,
    DropZone,
    EditorContainer,
    EmptyState,
    IconButton,
    Input,
    ItemActions,
    Label,
    Palette,
    PaletteItem as PaletteItemStyled,
    PaletteSection,
    PaletteTitle,
    PropertiesPanel,
    PropertyGroup,
    SortableItemStyled,
    Toolbar,
    ToolbarButton
} from './styled';
import type { SortableElementProps, VisualEditorProps } from './types';
import { useVisualEditor } from './useVisualEditor';
import { PALETTE_ITEMS, renderElement } from './utils';

// Sortable Element Component
function SortableElement({
  element,
  isSelected,
  onSelect,
  onDelete,
}: SortableElementProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: element.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <SortableItemStyled
      ref={setNodeRef}
      style={style}
      $isDragging={isDragging}
      $isSelected={isSelected}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(element.id);
      }}
      {...attributes}
      {...listeners}
    >
      {renderElement(element)}
      <ItemActions className="item-actions">
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            onDelete(element.id);
          }}
        >
          ✕
        </IconButton>
      </ItemActions>
    </SortableItemStyled>
  );
}

// Main Component
export function VisualEditor({ onCodeGenerated }: VisualEditorProps) {
  const {
    elements,
    activeId,
    selectedElementId,
    sensors,
    handleDragStart,
    handleDragEnd,
    handleAddElement,
    handleSelectElement,
    handleDeleteElement,
    handleUpdateProperty,
    handleGenerateCode,
  } = useVisualEditor(onCodeGenerated);

  const activeElement = activeId
    ? elements.find((el) => el.id === activeId)
    : null;

  const selectedEl = selectedElementId
    ? elements.find((el) => el.id === selectedElementId)
    : null;

  return (
    <EditorContainer>
      {/* Component Palette */}
      <Palette>
        <PaletteTitle>Components</PaletteTitle>
        <PaletteSection>
          {PALETTE_ITEMS.map((item) => (
            <PaletteItemStyled
              key={item.type}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleAddElement(item.type)}
            >
              <span style={{ fontSize: '20px' }}>{item.icon}</span>
              <span>{item.label}</span>
            </PaletteItemStyled>
          ))}
        </PaletteSection>
      </Palette>

      {/* Canvas Area */}
      <Canvas onClick={() => handleSelectElement('')}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <CanvasContent>
            {elements.length === 0 ? (
              <DropZone isEmpty={true}>
                <EmptyState>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎨</div>
                  <h3>Start Building</h3>
                  <p>Click on components in the palette to add them here</p>
                </EmptyState>
              </DropZone>
            ) : (
              <SortableContext
                items={elements.map((el) => el.id)}
                strategy={verticalListSortingStrategy}
              >
                <AnimatePresence>
                  {elements.map((element) => (
                    <motion.div
                      key={element.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      <SortableElement
                        element={element}
                        isSelected={element.id === selectedElementId}
                        onSelect={handleSelectElement}
                        onDelete={handleDeleteElement}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </SortableContext>
            )}
          </CanvasContent>

          <DragOverlay>
            {activeElement ? (
              <SortableItemStyled $isDragging $isSelected={false}>
                {renderElement(activeElement)}
              </SortableItemStyled>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* Toolbar */}
        <Toolbar>
          <ToolbarButton
            onClick={handleGenerateCode}
            disabled={elements.length === 0}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Generate Code
          </ToolbarButton>
        </Toolbar>
      </Canvas >

      {/* Properties Panel */}
      < PropertiesPanel >
        <PaletteTitle>Properties</PaletteTitle>
        {
          selectedEl ? (
            <PropertyGroup>
              {Object.entries(selectedEl.props).map(([key, value]) => (
                <div key={key}>
                  <Label>{key}</Label>
                  <Input
                    type="text"
                    value={String(value)}
                    onChange={(e) => handleUpdateProperty(key, e.target.value)}
                  />
                </div>
              ))}
            </PropertyGroup>
          ) : (
            <EmptyState style={{ padding: '20px', background: 'transparent' }}>
              <p style={{ fontSize: '12px', color: '#9ca3af' }}>
                Select an element to edit its properties
              </p>
            </EmptyState>
          )
        }
      </PropertiesPanel >
    </EditorContainer >
  );
}

export default VisualEditor;

// Re-export types and utilities
export * from './types';
export { useVisualEditor } from './useVisualEditor';
export { generateCode, PALETTE_ITEMS, renderElement } from './utils';
