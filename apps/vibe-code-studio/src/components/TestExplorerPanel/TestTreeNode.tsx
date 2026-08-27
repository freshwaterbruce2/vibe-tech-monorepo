/**
 * TestTreeNode — one test file row: status icon, per-test children with
 * expandable failure details, and a run affordance (spec 08 AC #2/#3/#6).
 * Spec: FEATURE_SPECS/competitive-gaps/08-TEST-EXPLORER.md
 */
import { useState } from 'react';
import styled from 'styled-components';
import {
  STATUS_ICONS,
  type TestFileNode,
  type TestNodeStatus,
} from '../../services/testing/TestController';

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  border-radius: 5px;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  span.file {
    flex: 1;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const Small = styled.button`
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  border: 1px solid var(--border-color, #333);
  background: transparent;
  color: var(--text-primary, #d4d4d4);
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;

const Cases = styled.ul`
  margin: 0 0 4px 26px;
  padding: 0;
  list-style: none;
  font-size: 12px;

  li {
    padding: 2px 0;
  }

  pre {
    margin: 4px 0 4px 18px;
    padding: 6px 8px;
    background: rgba(0, 0, 0, 0.3);
    border-radius: 5px;
    font-size: 11px;
    white-space: pre-wrap;
    color: #ff9d9d;
  }
`;

const STATUS_COLORS: Record<TestNodeStatus, string> = {
  idle: '#9a9ab0',
  running: '#e5c07b',
  passed: '#7ec699',
  failed: '#ff6b6b',
  skipped: '#e5c07b',
};

const Icon = ({ status }: { status: TestNodeStatus }) => (
  <span data-testid={`status-${status}`} style={{ color: STATUS_COLORS[status] }}>
    {STATUS_ICONS[status]}
  </span>
);

export interface TestTreeNodeProps {
  node: TestFileNode;
  busy: boolean;
  onRunFile: (file: string) => void;
}

export const TestTreeNode = ({ node, busy, onRunFile }: TestTreeNodeProps) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div data-testid={`test-file-${node.file}`}>
      <Row>
        <Icon status={node.status} />
        <span className="file" title={node.file}>
          {node.file}
        </span>
        {node.tests.length > 0 && (
          <Small data-testid="test-expand" onClick={() => setExpanded(open => !open)}>
            {expanded ? 'Hide' : `${node.passed}✓ ${node.failed}✗`}
          </Small>
        )}
        <Small data-testid="test-run-file" disabled={busy} onClick={() => onRunFile(node.file)}>
          Run
        </Small>
      </Row>
      {expanded && (
        <Cases data-testid="test-cases">
          {node.tests.map(test => (
            <li key={test.id}>
              <Icon status={test.status} /> {test.name}{' '}
              <span style={{ opacity: 0.6 }}>({test.duration}ms)</span>
              {test.status === 'failed' && test.error && <pre>{test.error}</pre>}
            </li>
          ))}
        </Cases>
      )}
    </div>
  );
};
