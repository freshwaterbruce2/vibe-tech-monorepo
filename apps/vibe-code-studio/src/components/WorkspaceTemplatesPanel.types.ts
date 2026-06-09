export interface WorkspaceTemplatesPanelProps {
  onClose: () => void;
  onSuccess?: (title: string, message: string) => void;
  onError?: (title: string, message: string) => void;
}
