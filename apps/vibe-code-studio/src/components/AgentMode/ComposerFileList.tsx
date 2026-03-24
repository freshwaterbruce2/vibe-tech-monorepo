import React from 'react';
import { Code, Plus, FileText } from 'lucide-react';

import type { ComposerFile, ComposerWorkspaceContext } from './ComposerMode.types';
import { FileList, FileListHeader, ActionButton, FileItem, ActionButtonGroup, FileNewBadge } from './ComposerMode.styles';

export interface ComposerFileListProps {
  files: ComposerFile[];
  selectedFileId: string | null;
  workspaceContext?: ComposerWorkspaceContext;
  onAddFile: () => void;
  onLoadWorkspaceFiles: () => void;
  onSelectFile: (fileId: string) => void;
}

export const ComposerFileList: React.FC<ComposerFileListProps> = ({
  files,
  selectedFileId,
  workspaceContext,
  onAddFile,
  onLoadWorkspaceFiles,
  onSelectFile,
}) => {
  return (
    <FileList>
      <FileListHeader>
        <h3>FILES ({files.length})</h3>
        <ActionButtonGroup>
          {workspaceContext?.openFiles && workspaceContext.openFiles.length > 0 && (
            <ActionButton 
              onClick={onLoadWorkspaceFiles}
              title="Load workspace files"
            >
              <Code size={16} />
            </ActionButton>
          )}
          <ActionButton onClick={onAddFile} title="Add new file">
            <Plus size={16} />
          </ActionButton>
        </ActionButtonGroup>
      </FileListHeader>
      {files.map(file => (
        <FileItem
          key={file.id}
          $selected={selectedFileId === file.id}
          $isDirty={file.isDirty}
          onClick={() => onSelectFile(file.id)}
          whileHover={{ x: 4 }}
        >
          <FileText />
          <span className="file-name">{file.path}</span>
          <div className="file-status">
            {file.isDirty && <div className="dot" />}
            {file.isNew && (
              <FileNewBadge>NEW</FileNewBadge>
            )}
          </div>
        </FileItem>
      ))}
    </FileList>
  );
};
