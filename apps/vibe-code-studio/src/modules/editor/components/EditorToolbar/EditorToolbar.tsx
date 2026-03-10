
import './EditorToolbar.css';

interface EditorToolbarProps {
  fileName: string;
  isModified: boolean;
  language: string;
}

export const EditorToolbar = ({ fileName, isModified, language }: EditorToolbarProps) => {
  return (
    <div className="editor-toolbar">
      <div className="editor-toolbar-left">
        <span className="editor-file-name">
          {fileName}
          {isModified && <span className="editor-modified-indicator">●</span>}
        </span>
      </div>
      <div className="editor-toolbar-right">
        <span className="editor-language">{language}</span>
      </div>
    </div>
  );
};
