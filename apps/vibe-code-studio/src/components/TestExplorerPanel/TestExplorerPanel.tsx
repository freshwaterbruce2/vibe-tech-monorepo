/**
 * TestExplorerPanel — spec 08 Phase 1: discovered test files as a tree with
 * per-file run, run-all, re-run-failed, and failure details. Rendered by
 * TestExplorerPanelHost (store-gated).
 * Spec: FEATURE_SPECS/competitive-gaps/08-TEST-EXPLORER.md
 */
import styled from 'styled-components';
import { useTestExplorerStore } from '../../stores/testExplorerStore';
import { TestTreeNode } from './TestTreeNode';

const Panel = styled.div`
  position: fixed;
  top: 48px;
  right: 12px;
  bottom: 12px;
  width: min(440px, 92vw);
  background: var(--bg-secondary, #1e1e2e);
  border: 1px solid var(--border-color, #333);
  border-radius: 10px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  z-index: 900;
  overflow-y: auto;
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;

  h2 {
    margin: 0;
    font-size: 14px;
    flex: 1;
  }
`;

const Button = styled.button`
  font-size: 12px;
  padding: 5px 10px;
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

const Note = styled.p<{ $error?: boolean }>`
  margin: 0;
  font-size: 12px;
  color: ${({ $error }) => ($error ? '#ff6b6b' : 'var(--text-secondary, #9a9ab0)')};
`;

export interface TestExplorerPanelProps {
  onDiscover: () => void;
  onRunAll: () => void;
  onRunFile: (file: string) => void;
  onRerunFailed: (files: string[]) => void;
  onClose: () => void;
}

export const TestExplorerPanel = ({
  onDiscover,
  onRunAll,
  onRunFile,
  onRerunFailed,
  onClose,
}: TestExplorerPanelProps) => {
  const framework = useTestExplorerStore(state => state.framework);
  const files = useTestExplorerStore(state => state.files);
  const discovering = useTestExplorerStore(state => state.discovering);
  const runningAll = useTestExplorerStore(state => state.runningAll);
  const error = useTestExplorerStore(state => state.error);

  const busy = discovering || runningAll;
  const failedFiles = files.filter(node => node.status === 'failed').map(node => node.file);

  return (
    <Panel data-testid="test-explorer-panel">
      <Head>
        <h2>Test Explorer{framework ? ` — ${framework}` : ''}</h2>
        <Button
          type="button"
          className="secondary"
          data-testid="test-discover"
          disabled={busy}
          onClick={onDiscover}
        >
          {discovering ? 'Discovering…' : 'Discover'}
        </Button>
        <Button type="button" data-testid="test-run-all" disabled={busy} onClick={onRunAll}>
          {runningAll ? 'Running…' : 'Run All'}
        </Button>
        <Button
          type="button"
          className="secondary"
          data-testid="test-rerun-failed"
          disabled={busy || failedFiles.length === 0}
          onClick={() => onRerunFailed(failedFiles)}
        >
          Re-run Failed
        </Button>
        <Button type="button" className="secondary" onClick={onClose}>
          Close
        </Button>
      </Head>
      {error && (
        <Note $error data-testid="test-explorer-error">
          {error}
        </Note>
      )}
      {files.length === 0 && !discovering && (
        <Note data-testid="test-explorer-empty">
          No test files yet — hit Discover to scan the workspace.
        </Note>
      )}
      {files.map(node => (
        <TestTreeNode key={node.file} node={node} busy={busy} onRunFile={onRunFile} />
      ))}
    </Panel>
  );
};
