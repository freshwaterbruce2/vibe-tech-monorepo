import { FileText } from 'lucide-react';

import { ContextInfo } from '../styled';
import { CollapsibleSection } from './CollapsibleSection';

import type { WorkspaceContextInfo } from '../types';

interface ContextPanelProps {
  workspaceContext: WorkspaceContextInfo;
  isExpanded: boolean;
  onToggle: () => void;
}

export const ContextPanel = ({
  workspaceContext,
  isExpanded,
  onToggle,
}: ContextPanelProps) => {
  return (
    <CollapsibleSection
      title="Context"
      icon={<FileText />}
      isExpanded={isExpanded}
      onToggle={onToggle}
    >
      <ContextInfo>
        <div>
          <strong>Workspace:</strong> {workspaceContext.workspaceFolder}
        </div>
        {workspaceContext.currentFile && (
          <div>
            <strong>Current File:</strong> {workspaceContext.currentFile}
          </div>
        )}
        {workspaceContext.openFiles && (
          <div>
            <strong>Open Files:</strong> {workspaceContext.openFiles.length}
          </div>
        )}
      </ContextInfo>
    </CollapsibleSection>
  );
};
