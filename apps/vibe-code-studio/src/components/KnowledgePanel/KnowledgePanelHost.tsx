/**
 * KnowledgePanelHost — store-gated mount for the KnowledgePanel
 * (SchedulePanelHost pattern). Loads persisted items on first open and
 * routes panel actions through knowledgeIntegration.
 * Spec: FEATURE_SPECS/competitive-gaps/04-AGENT-MEMORY-KNOWLEDGE.md
 */
import { useEffect } from 'react';
import {
  addKnowledgeItem,
  deleteKnowledgeItem,
  loadKnowledge,
  updateKnowledgeItem,
} from '../../services/knowledge/knowledgeIntegration';
import { logger } from '../../services/Logger';
import { useKnowledgeStore } from '../../stores/knowledgeStore';
import { KnowledgePanel } from './KnowledgePanel';

const run = (operation: Promise<unknown>, label: string): void => {
  operation.catch(error => logger.error(`[knowledge] ${label} failed`, error));
};

export const KnowledgePanelHost = () => {
  const panelOpen = useKnowledgeStore(state => state.panelOpen);
  const setPanelOpen = useKnowledgeStore(state => state.actions.setPanelOpen);

  useEffect(() => {
    if (panelOpen) {
      run(loadKnowledge(), 'load');
    }
  }, [panelOpen]);

  if (!panelOpen) {
    return null;
  }

  return (
    <KnowledgePanel
      onAdd={draft => run(addKnowledgeItem(draft), 'add')}
      onSave={(id, content) => run(updateKnowledgeItem(id, { content }), 'update')}
      onDelete={id => run(deleteKnowledgeItem(id), 'delete')}
      onClose={() => setPanelOpen(false)}
    />
  );
};
