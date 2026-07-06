/**
 * TestExplorerPanelHost — store-gated mount (SchedulePanelHost pattern).
 * Builds the real TestRunner against the open workspace and routes panel
 * actions through the TestController orchestration.
 * Spec: FEATURE_SPECS/competitive-gaps/08-TEST-EXPLORER.md
 */
import { useMemo } from 'react';
import {
  discoverTests,
  runAllTests,
  runnerFactory,
  runTestFile,
} from '../../services/testing/TestController';
import { useEditorStore } from '../../stores/useEditorStore';
import { useTestExplorerStore } from '../../stores/testExplorerStore';
import { TestExplorerPanel } from './TestExplorerPanel';

export const TestExplorerPanelHost = () => {
  const panelOpen = useTestExplorerStore(state => state.panelOpen);
  const setPanelOpen = useTestExplorerStore(state => state.actions.setPanelOpen);
  const workspaceFolder = useEditorStore(state => state.workspaceFolder);

  const runner = useMemo(
    () => (workspaceFolder ? runnerFactory.create(workspaceFolder) : null),
    [workspaceFolder]
  );

  if (!panelOpen || !runner) {
    return null;
  }

  return (
    <TestExplorerPanel
      onDiscover={() => void discoverTests(runner)}
      onRunAll={() => void runAllTests(runner)}
      onRunFile={file => void runTestFile(runner, file)}
      onRerunFailed={files => {
        for (const file of files) {
          void runTestFile(runner, file);
        }
      }}
      onClose={() => setPanelOpen(false)}
    />
  );
};
