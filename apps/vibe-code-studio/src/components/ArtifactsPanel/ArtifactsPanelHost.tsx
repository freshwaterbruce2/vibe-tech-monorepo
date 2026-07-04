/**
 * ArtifactsPanelHost — store-driven mount for the ArtifactsPanel (same
 * pattern as ProblemsPanelHost/SchedulePanelHost: owns open/close state via
 * artifactsStore so the app shell stays untouched). Boots artifact capture
 * against the app's real BackgroundAgentSystem event stream and wires the
 * task deep link to the existing Background Tasks panel.
 * Spec: FEATURE_SPECS/competitive-gaps/09-VERIFIABLE-ARTIFACTS.md
 */
import { useEffect } from 'react';
import { useServices, useUIPanel } from '../../app/contexts';
import {
  deleteArtifact,
  initArtifactCapture,
  runArtifactAction,
} from '../../services/artifacts/artifactCapture';
import { useArtifactsStore } from '../../stores/artifactsStore';
import { ArtifactsPanel } from './index';

export const ArtifactsPanelHost = () => {
  const services = useServices();
  const ui = useUIPanel();
  const panelOpen = useArtifactsStore(state => state.panelOpen);
  const setPanelOpen = useArtifactsStore(state => state.actions.setPanelOpen);

  useEffect(() => {
    runArtifactAction(() => initArtifactCapture(services.backgroundAgentSystem), 'init');
  }, [services.backgroundAgentSystem]);

  return (
    <ArtifactsPanel
      isOpen={panelOpen}
      onClose={() => setPanelOpen(false)}
      onOpenTask={() => ui.setBackgroundPanelOpen(true)}
      onDelete={id => runArtifactAction(() => deleteArtifact(id), 'delete')}
    />
  );
};
