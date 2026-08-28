/**
 * KnowledgePanel — spec 04 Phase 1: list/filter/add/edit/delete durable
 * knowledge items. Rendered by KnowledgePanelHost (store-gated).
 * Spec: FEATURE_SPECS/competitive-gaps/04-AGENT-MEMORY-KNOWLEDGE.md
 */
import { useMemo, useState } from 'react';
import styled from 'styled-components';
import type { KnowledgeDraft } from '../../services/knowledge/types';
import { useKnowledgeStore } from '../../stores/knowledgeStore';
import { KnowledgeItemCard } from './KnowledgeItemCard';

const Panel = styled.div`
  position: fixed;
  top: 48px;
  right: 12px;
  bottom: 12px;
  width: min(420px, 92vw);
  background: var(--bg-secondary, #1e1e2e);
  border: 1px solid var(--border-color, #333);
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 900;
  overflow-y: auto;
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  h2 {
    margin: 0;
    font-size: 14px;
    flex: 1;
  }
`;

const Input = styled.input`
  background: var(--bg-primary, #141420);
  color: var(--text-primary, #d4d4d4);
  border: 1px solid var(--border-color, #333);
  border-radius: 6px;
  padding: 7px 9px;
  font-size: 12px;
`;

const Editor = styled.textarea`
  min-height: 70px;
  resize: vertical;
  background: var(--bg-primary, #141420);
  color: var(--text-primary, #d4d4d4);
  border: 1px solid var(--border-color, #333);
  border-radius: 6px;
  padding: 8px;
  font-size: 12px;
`;

const Button = styled.button`
  padding: 6px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-color, #333);
  background: var(--accent-color, #4f8cff);
  color: white;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }

  &.secondary {
    background: transparent;
    color: var(--text-primary, #d4d4d4);
  }
`;

const Empty = styled.p`
  margin: 0;
  font-size: 12px;
  color: var(--text-secondary, #9a9ab0);
`;

export interface KnowledgePanelProps {
  onAdd: (draft: KnowledgeDraft) => void;
  onSave: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export const KnowledgePanel = ({ onAdd, onSave, onDelete, onClose }: KnowledgePanelProps) => {
  const items = useKnowledgeStore(state => state.items);
  const categoryFilter = useKnowledgeStore(state => state.categoryFilter);
  const setCategoryFilter = useKnowledgeStore(state => state.actions.setCategoryFilter);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');

  const categories = useMemo(
    () => Array.from(new Set(items.map(item => item.category))).sort(),
    [items]
  );
  const visible = useMemo(
    () => (categoryFilter ? items.filter(item => item.category === categoryFilter) : items),
    [items, categoryFilter]
  );

  const add = () => {
    onAdd({ title, content, category: category || undefined });
    setTitle('');
    setContent('');
    setCategory('');
  };

  return (
    <Panel data-testid="knowledge-panel">
      <Head>
        <h2>Knowledge Items</h2>
        <select
          data-testid="knowledge-filter"
          value={categoryFilter ?? ''}
          onChange={event => setCategoryFilter(event.target.value || null)}
        >
          <option value="">all categories</option>
          {categories.map(value => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <Button type="button" className="secondary" onClick={onClose}>
          Close
        </Button>
      </Head>
      <Input
        data-testid="knowledge-title"
        placeholder="Title"
        value={title}
        onChange={event => setTitle(event.target.value)}
      />
      <Editor
        data-testid="knowledge-content"
        placeholder="Durable fact (markdown)…"
        value={content}
        onChange={event => setContent(event.target.value)}
      />
      <Input
        data-testid="knowledge-category"
        placeholder="Category (default: general)"
        value={category}
        onChange={event => setCategory(event.target.value)}
      />
      <Button
        type="button"
        data-testid="knowledge-add"
        onClick={add}
        disabled={!title.trim() || !content.trim()}
      >
        Add Knowledge Item
      </Button>
      {visible.length === 0 && <Empty data-testid="knowledge-empty">No knowledge items.</Empty>}
      {visible.map(item => (
        <KnowledgeItemCard key={item.id} item={item} onSave={onSave} onDelete={onDelete} />
      ))}
    </Panel>
  );
};
