import React from 'react';
import { Editor as MonacoEditor } from '@monaco-editor/react';
import { X } from 'lucide-react';

import { vibeTheme } from '../../styles/theme';
import { ComposerFile } from './ComposerMode.types';
import { 
  EditorSection, 
  EditorHeader, 
  ActionButton, 
  EditorContainer, 
  EditorToolbar 
} from './ComposerMode.styles';

export interface ComposerEditorProps {
  selectedFile?: ComposerFile;
  onRemoveFile: (fileId: string) => void;
  onChangeFileContent: (fileId: string, content: string) => void;
  onResetFileContent: (fileId: string) => void;
}

export const ComposerEditor: React.FC<ComposerEditorProps> = ({
  selectedFile,
  onRemoveFile,
  onChangeFileContent,
  onResetFileContent,
}) => {
  return (
    <EditorSection>
      {selectedFile ? (
        <>
          <EditorHeader>
            <span className="file-path">{selectedFile.path}</span>
            <ActionButton onClick={() => onRemoveFile(selectedFile.id)}>
              <X size={16} />
            </ActionButton>
          </EditorHeader>
          <EditorContainer>
            <EditorToolbar>
              <div className="editor-info">
                <span>{selectedFile.language.toUpperCase()}</span>
                <span>•</span>
                <span>{selectedFile.content.split('\n').length} lines</span>
                <span>•</span>
                <span>{selectedFile.content.length} chars</span>
                {selectedFile.isDirty && (
                  <>
                    <span>•</span>
                    <span style={{ color: vibeTheme.colors.warning }}>Modified</span>
                  </>
                )}
              </div>
              <div className="editor-actions">
                <ActionButton onClick={() => onResetFileContent(selectedFile.id)}>
                  Reset
                </ActionButton>
              </div>
            </EditorToolbar>
            <div style={{ flex: 1 }}>
              <MonacoEditor
                language={selectedFile.language}
                value={selectedFile.content}
                onChange={(value) => onChangeFileContent(selectedFile.id, value ?? '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  automaticLayout: true,
                  folding: true,
                  renderWhitespace: 'selection',
                  bracketPairColorization: { enabled: true },
                  tabSize: 2,
                  insertSpaces: true,
                }}
              />
            </div>
          </EditorContainer>
        </>
      ) : (
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: vibeTheme.colors.textSecondary
        }}>
          Select a file or add a new one to begin editing
        </div>
      )}
    </EditorSection>
  );
};
