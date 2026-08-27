/**
 * KnowledgeItemCard — one knowledge item: markdown body, inline edit and
 * delete (spec 04 AC #6). Content renders through the spec-05
 * MarkdownContent viewer.
 * Spec: FEATURE_SPECS/competitive-gaps/04-AGENT-MEMORY-KNOWLEDGE.md
 */
import { useState } from 'react';
import styled from 'styled-components';
import type { KnowledgeItem } from '../../services/knowledge/types';
import { MarkdownContent } from '../ArtifactsPanel/MarkdownContent';

const Card = styled.div`
  border: 1px solid var(--border-color, #333);
  border-radius: 8px;
  background: var(--bg-primary, #141420);
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;

  h3 {
    margin: 0;
    font-size: 13px;
    flex: 1;
  }
`;

const Tag = styled.span`
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 10px;
  background: rgba(79, 140, 255, 0.15);
  color: var(--accent-color, #4f8cff);
`;

const Meta = styled.span`
  font-size: 11px;
  color: var(--text-secondary, #9a9ab0);
`;

const Small = styled.button`
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--border-color, #333);
  background: transparent;
  color: var(--text-primary, #d4d4d4);
  cursor: pointer;
`;

const Editor = styled.textarea`
  min-height: 90px;
  resize: vertical;
  background: var(--bg-secondary, #1e1e2e);
  color: var(--text-primary, #d4d4d4);
  border: 1px solid var(--border-color, #333);
  border-radius: 6px;
  padding: 8px;
  font-size: 12px;
`;

export interface KnowledgeItemCardProps {
  item: KnowledgeItem;
  onSave: (id: string, content: string) => void;
  onDelete: (id: string) => void;
}

export const KnowledgeItemCard = ({ item, onSave, onDelete }: KnowledgeItemCardProps) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.content);

  const save = () => {
    onSave(item.id, draft);
    setEditing(false);
  };

  return (
    <Card data-testid={`knowledge-item-${item.id}`}>
      <Head>
        <h3>{item.title}</h3>
        <Tag>{item.category}</Tag>
        {editing ? (
          <Small data-testid="knowledge-save" onClick={save}>
            Save
          </Small>
        ) : (
          <Small data-testid="knowledge-edit" onClick={() => setEditing(true)}>
            Edit
          </Small>
        )}
        <Small data-testid="knowledge-delete" onClick={() => onDelete(item.id)}>
          Delete
        </Small>
      </Head>
      {editing ? (
        <Editor
          data-testid="knowledge-editor"
          value={draft}
          onChange={event => setDraft(event.target.value)}
        />
      ) : (
        <MarkdownContent markdown={item.content} />
      )}
      <Meta>
        source: {item.sourceSessionId} · updated {item.updatedAt}
      </Meta>
    </Card>
  );
};
