import { memo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Command,
  Eye,
  FileText,
  FolderOpen,
  GitBranch,
  HelpCircle,
  Image,
  Info,
  ListTodo,
  Menu,
  Minimize2,
  Search,
  Settings,
  Square,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import styled from 'styled-components';

import { ElectronService } from '../services/ElectronService';
import { vibeTheme } from '../styles/theme';

import type { DropdownMenuItem } from './ui/dropdown-menu';
import { DropdownMenu } from './ui/dropdown-menu';

const TitleBarContainer = styled.div`
  display: flex;
  align-items: center;
  height: 44px;
  background: ${vibeTheme.colors.primary};
  border-bottom: 1px solid rgba(139, 92, 246, 0.15);
  user-select: none;
  -webkit-app-region: drag;
  position: relative;
  z-index: 1000;
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.md};
  padding: 0 ${vibeTheme.spacing.md};
  -webkit-app-region: no-drag;
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.sm};
  font-weight: ${vibeTheme.typography.fontWeight.bold};
  color: ${vibeTheme.colors.text};
  font-size: ${vibeTheme.typography.fontSize.lg};

  &::before {
    content: '⚡';
    font-size: 1.5rem;
    background: ${vibeTheme.gradients.primary};
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

const AppTitle = styled.span`
  background: ${vibeTheme.gradients.primary};
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: ${vibeTheme.typography.fontWeight.extrabold};
  letter-spacing: ${vibeTheme.typography.letterSpacing.tight};
  font-size: ${vibeTheme.typography.fontSize.md};
`;

const CenterSection = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 ${vibeTheme.spacing.md};
`;

const StatusIndicator = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.sm};
  padding: ${vibeTheme.spacing.xs} ${vibeTheme.spacing.md};
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: ${vibeTheme.borderRadius.full};
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.textSecondary};
  backdrop-filter: blur(10px);
`;

const StatusDot = styled.div<{ $status: 'online' | 'offline' | 'loading' }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => {
    switch (props.$status) {
      case 'online':
        return vibeTheme.colors.success;
      case 'offline':
        return vibeTheme.colors.error;
      case 'loading':
        return vibeTheme.colors.cyan;
      default:
        return vibeTheme.colors.textMuted;
    }
  }};
  box-shadow: 0 0 8px
    ${props => {
      switch (props.$status) {
        case 'online':
          return vibeTheme.colors.success;
        case 'offline':
          return vibeTheme.colors.error;
        case 'loading':
          return vibeTheme.colors.cyan;
        default:
          return 'transparent';
      }
    }};
  animation: ${props => (props.$status === 'loading' ? 'pulse 2s infinite' : 'none')};

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.xs};
  padding: 0 ${vibeTheme.spacing.md};
  -webkit-app-region: no-drag;
`;

const ActionButton = styled.button<{ $variant?: 'primary' | 'danger' }>`
  background: transparent;
  border: none;
  color: ${vibeTheme.colors.textSecondary};
  padding: ${vibeTheme.spacing.sm};
  border-radius: ${vibeTheme.borderRadius.small};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all ${vibeTheme.animation.duration.fast} ease;
  position: relative;

  &:hover {
    background: ${props => {
      if (props.$variant === 'danger') {
        return 'rgba(239, 68, 68, 0.2)';
      }
      if (props.$variant === 'primary') {
        return 'rgba(139, 92, 246, 0.2)';
      }
      return 'rgba(255, 255, 255, 0.1)';
    }};
    color: ${props => {
      if (props.$variant === 'danger') {
        return vibeTheme.colors.error;
      }
      if (props.$variant === 'primary') {
        return vibeTheme.colors.purple;
      }
      return vibeTheme.colors.text;
    }};
    transform: scale(1.05);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const MenuButton = styled(ActionButton)`
  margin-right: ${vibeTheme.spacing.sm};

  &:hover {
    background: rgba(139, 92, 246, 0.2);
    box-shadow: 0 0 12px rgba(139, 92, 246, 0.3);
  }
`;

const AboutOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(8, 17, 31, 0.75);
  -webkit-app-region: no-drag;
`;

const AboutDialog = styled.div`
  min-width: 320px;
  padding: ${vibeTheme.spacing.xl};
  background: ${vibeTheme.colors.elevated};
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: ${vibeTheme.borderRadius.md};
  box-shadow: ${vibeTheme.shadows.lg};
  color: ${vibeTheme.colors.text};
  text-align: center;
`;

const AboutTitle = styled.h2`
  margin: 0 0 ${vibeTheme.spacing.sm};
  background: ${vibeTheme.gradients.primary};
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-size: ${vibeTheme.typography.fontSize.lg};
`;

const AboutVersion = styled.p`
  margin: 0 0 ${vibeTheme.spacing.lg};
  color: ${vibeTheme.colors.textSecondary};
  font-size: ${vibeTheme.typography.fontSize.sm};
`;

const AboutCloseButton = styled.button`
  padding: ${vibeTheme.spacing.sm} ${vibeTheme.spacing.lg};
  background: ${vibeTheme.colors.purple};
  border: none;
  border-radius: ${vibeTheme.borderRadius.small};
  color: ${vibeTheme.colors.text};
  cursor: pointer;
  font-weight: ${vibeTheme.typography.fontWeight.medium};
`;

interface TitleBarProps {
  onSettingsClick?: () => void;
  onNewFile?: () => void;
  onOpenFolder?: () => void;
  onSaveAll?: () => void;
  onCloseFolder?: () => void;
  onScreenshotToCode?: () => void;
  onToggleSidebar?: () => void;
  onToggleAIChat?: () => void;
  onTogglePreview?: () => void;
  onToggleBackgroundPanel?: () => void;
  onToggleGitPanel?: () => void;
  onFind?: () => void;
  onReplace?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  previewOpen?: boolean;
  children?: ReactNode;
}

const TitleBar = ({
  onSettingsClick,
  onNewFile,
  onOpenFolder,
  onSaveAll,
  onCloseFolder,
  onScreenshotToCode,
  onToggleSidebar,
  onToggleAIChat,
  onTogglePreview,
  onToggleBackgroundPanel,
  onToggleGitPanel,
  onFind,
  onReplace,
  onZoomIn,
  onZoomOut,
  previewOpen,
  children,
}: TitleBarProps) => {
  const [electronService] = useState(() => new ElectronService());
  const [aboutOpen, setAboutOpen] = useState(false);
  const appVersion = (import.meta.env['VITE_APP_VERSION'] as string | undefined) ?? 'dev';

  const menuItems: DropdownMenuItem[] = [
    {
      id: 'file',
      label: 'File',
      icon: <FileText size={16} />,
      submenu: [
        {
          id: 'file-new',
          label: 'New File',
          icon: <FileText size={16} />,
          shortcut: 'Ctrl+N',
          onClick: onNewFile,
        },
        {
          id: 'file-open',
          label: 'Open Folder',
          icon: <FolderOpen size={16} />,
          shortcut: 'Ctrl+O',
          onClick: onOpenFolder,
        },
        { id: 'divider-1', label: '', divider: true },
        {
          id: 'file-save-all',
          label: 'Save All',
          shortcut: 'Ctrl+Shift+S',
          onClick: onSaveAll,
        },
        { id: 'divider-2', label: '', divider: true },
        {
          id: 'file-close-folder',
          label: 'Close Folder',
          onClick: onCloseFolder,
        },
      ],
    },
    {
      id: 'edit',
      label: 'Edit',
      submenu: [
        {
          id: 'edit-find',
          label: 'Find',
          icon: <Search size={16} />,
          shortcut: 'Ctrl+F',
          onClick: onFind,
        },
        {
          id: 'edit-replace',
          label: 'Replace',
          shortcut: 'Ctrl+H',
          onClick: onReplace,
        },
        { id: 'divider-3', label: '', divider: true },
        {
          id: 'edit-preferences',
          label: 'Preferences',
          icon: <Settings size={16} />,
          shortcut: 'Ctrl+,',
          onClick: onSettingsClick,
        },
      ],
    },
    {
      id: 'view',
      label: 'View',
      submenu: [
        {
          id: 'view-sidebar',
          label: 'Toggle Sidebar',
          shortcut: 'Ctrl+B',
          onClick: onToggleSidebar,
        },
        {
          id: 'view-ai-chat',
          label: 'Toggle AI Chat',
          shortcut: 'Ctrl+Shift+L',
          onClick: onToggleAIChat,
        },
        {
          id: 'view-source-control',
          label: 'Source Control',
          icon: <GitBranch size={16} />,
          shortcut: 'Ctrl+Shift+G',
          onClick: onToggleGitPanel,
        },
        {
          id: 'view-preview',
          label: 'Toggle Preview Panel',
          icon: <Eye size={16} />,
          shortcut: 'Ctrl+Shift+V',
          onClick: onTogglePreview,
        },
        {
          id: 'view-screenshot-to-code',
          label: 'Screenshot to Code',
          icon: <Image size={16} />,
          shortcut: 'Ctrl+Shift+I',
          onClick: onScreenshotToCode,
        },
        {
          id: 'view-background-tasks',
          label: 'Background Tasks',
          icon: <ListTodo size={16} />,
          shortcut: 'Ctrl+Shift+T',
          onClick: onToggleBackgroundPanel,
        },
        { id: 'divider-4', label: '', divider: true },
        {
          id: 'view-zoom-in',
          label: 'Zoom In',
          icon: <ZoomIn size={16} />,
          shortcut: 'Ctrl++',
          onClick: onZoomIn,
        },
        {
          id: 'view-zoom-out',
          label: 'Zoom Out',
          icon: <ZoomOut size={16} />,
          shortcut: 'Ctrl+-',
          onClick: onZoomOut,
        },
      ],
    },
    {
      id: 'help',
      label: 'Help',
      icon: <HelpCircle size={16} />,
      submenu: [
        {
          id: 'help-docs',
          label: 'Documentation',
          onClick: () => window.open('https://vibecodestudio.dev/docs', '_blank'),
        },
        { id: 'divider-5', label: '', divider: true },
        {
          id: 'help-about',
          label: 'About Vibe Code Studio',
          icon: <Info size={16} />,
          onClick: () => setAboutOpen(true),
        },
      ],
    },
  ];

  const handleSettingsClick = () => {
    if (onSettingsClick) {
      onSettingsClick();
    }
  };

  const handleMinimize = async () => {
    if (electronService.isElectron()) {
      await electronService.minimizeWindow();
    }
  };

  const handleMaximize = async () => {
    if (electronService.isElectron()) {
      await electronService.maximizeWindow();
    } else {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  };

  const handleClose = async () => {
    if (electronService.isElectron()) {
      await electronService.closeWindow();
    } else {
      if (window.confirm('Are you sure you want to close Vibe Code Studio?')) {
        window.close();
      }
    }
  };

  return (
    <TitleBarContainer>
      <LeftSection>
        <DropdownMenu
          items={menuItems}
          trigger={
            <MenuButton aria-label="Open application menu" title="Application menu">
              <Menu />
            </MenuButton>
          }
          align="left"
          width="220px"
        />
        <Logo>
          <AppTitle>Vibe Code Studio</AppTitle>
        </Logo>
      </LeftSection>

      <CenterSection>
        <StatusIndicator>
          <StatusDot $status="online" />
          <span>Vibe Code Studio</span>
          <Command size={12} />
        </StatusIndicator>
        {children}
      </CenterSection>

      <RightSection>
        {onTogglePreview && (
          <ActionButton
            onClick={onTogglePreview}
            title="Toggle Preview Panel (Ctrl+Shift+V)"
            aria-label="Toggle preview panel"
            style={{
              background: previewOpen ? 'rgba(139, 92, 246, 0.2)' : 'transparent',
              color: previewOpen ? vibeTheme.colors.purple : vibeTheme.colors.textSecondary,
            }}
          >
            <Eye />
          </ActionButton>
        )}
        <ActionButton onClick={handleSettingsClick} title="Settings" aria-label="Open settings">
          <Settings />
        </ActionButton>
        <ActionButton onClick={handleMinimize} title="Minimize" aria-label="Minimize window">
          <Minimize2 />
        </ActionButton>
        <ActionButton onClick={handleMaximize} title="Maximize" aria-label="Maximize window">
          <Square />
        </ActionButton>
        <ActionButton
          $variant="danger"
          onClick={handleClose}
          title="Close"
          aria-label="Close window"
        >
          <X />
        </ActionButton>
      </RightSection>

      {aboutOpen && (
        <AboutOverlay
          role="dialog"
          aria-modal="true"
          aria-labelledby="vcs-about-title"
          onClick={() => setAboutOpen(false)}
          onKeyDown={event => {
            if (event.key === 'Escape') setAboutOpen(false);
          }}
        >
          <AboutDialog onClick={e => e.stopPropagation()} tabIndex={-1} autoFocus>
            <AboutTitle id="vcs-about-title">Vibe Code Studio</AboutTitle>
            <AboutVersion>Version {appVersion}</AboutVersion>
            <AboutCloseButton onClick={() => setAboutOpen(false)}>Close</AboutCloseButton>
          </AboutDialog>
        </AboutOverlay>
      )}
    </TitleBarContainer>
  );
};

export default memo(TitleBar);
