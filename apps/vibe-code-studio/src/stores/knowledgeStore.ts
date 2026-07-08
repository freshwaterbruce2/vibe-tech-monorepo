/**
 * Knowledge store (UI) — panel state + item snapshot for spec 04. Source of
 * truth is services/knowledge/KnowledgeStore; this mirrors it for React.
 * Spec: FEATURE_SPECS/competitive-gaps/04-AGENT-MEMORY-KNOWLEDGE.md
 */
import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { KnowledgeItem } from '../services/knowledge/types';

export interface KnowledgeUiState {
  items: KnowledgeItem[];
  panelOpen: boolean;
  categoryFilter: string | null;
  actions: {
    setItems: (items: KnowledgeItem[]) => void;
    setPanelOpen: (open: boolean) => void;
    togglePanel: () => void;
    setCategoryFilter: (category: string | null) => void;
  };
}

export const useKnowledgeStore = create<KnowledgeUiState>()(
  devtools(
    subscribeWithSelector(
      immer(set => ({
        items: [],
        panelOpen: false,
        categoryFilter: null,
        actions: {
          setItems: items =>
            set(state => {
              state.items = items;
            }),
          setPanelOpen: open =>
            set(state => {
              state.panelOpen = open;
            }),
          togglePanel: () =>
            set(state => {
              state.panelOpen = !state.panelOpen;
            }),
          setCategoryFilter: category =>
            set(state => {
              state.categoryFilter = category;
            }),
        },
      }))
    ),
    { name: 'knowledge-store' }
  )
);
