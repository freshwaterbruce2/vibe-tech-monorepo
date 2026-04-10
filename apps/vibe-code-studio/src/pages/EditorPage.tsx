import styled from 'styled-components';

import Editor from '../components/Editor';
import Settings from '../components/Settings';
import Sidebar from '../components/Sidebar';
import { useEditorStore } from '../stores/useEditorStore';
import { vibeTheme } from '../styles/theme';

const PageContainer = styled.div`
  display: flex;
  height: 100%;
  background: ${vibeTheme.colors.primary};
`;

const EditorPage: React.FC = () => {
  const currentFile = useEditorStore((state) => state.currentFile);
  const openFiles = useEditorStore((state) => state.openFiles);
  const sidebarOpen = useEditorStore((state) => state.sidebarOpen);
  const workspaceFolder = useEditorStore((state) => state.workspaceFolder);
  const { openFile, toggleAIChat, toggleSettings, updateSettings } = useEditorStore((state) => state.actions);
  const aiChatOpen = useEditorStore((state) => state.aiChatOpen);
  const settingsOpen = useEditorStore((state) => state.settingsOpen);
  const settings = useEditorStore((state) => state.settings);

  const handleOpenFile = async (path: string) => {
    // For now, create a simple EditorFile from the path
    // In a real implementation, this would read the file content
    const file = {
      id: path,
      name: path.split('/').pop() ?? path,
      path,
      content: '', // Would be loaded from file system
      language: path.endsWith('.ts') || path.endsWith('.tsx') ? 'typescript' : 'javascript',
      isModified: false,
    };
    openFile(file);
  };

  const handleShowSettings = () => {
    toggleSettings();
  };

  return (
    <PageContainer>
      {sidebarOpen && (
        <Sidebar
          workspaceFolder={workspaceFolder}
          onOpenFile={handleOpenFile}
          onToggleAIChat={toggleAIChat}
          aiChatOpen={aiChatOpen}
          onShowSettings={handleShowSettings}
        />
      )}

      {currentFile && (
        <Editor
          file={currentFile}
          openFiles={openFiles}
          onFileChange={() => { }}
          onCloseFile={() => { }}
          onSaveFile={() => { }}
          onFileSelect={() => { }}
          aiService={{} as any} // Mock for legacy page
          workspaceContext={undefined}
          getFileContext={() => []}
          settings={settings}
          liveStream={{} as any}
          onEditorMount={() => {}}
        />
      )}

      <Settings
        isOpen={settingsOpen}
        onClose={toggleSettings}
        settings={settings}
        onSettingsChange={updateSettings}
      />
    </PageContainer>
  );
};

export default EditorPage;
