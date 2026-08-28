import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Command, Search } from 'lucide-react';
import styled from 'styled-components';

import {
  filterPaletteCommands,
  groupPaletteCommands,
  useWorkspaceSymbolMode,
} from '../hooks/useWorkspaceSymbolMode';
import { SYMBOL_QUERY_PREFIX } from '../services/lsp/workspaceSymbols';
import { vibeTheme } from '../styles/theme';

interface Command {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  shortcut?: string;
  action: () => void;
  category?: string;
  keywords?: string[];
}

export interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
  /**
   * Live provider for `#` symbol-mode searches (spec 07 AC #6). Defaults to the
   * LSP workspace-symbol search; injectable for tests.
   */
  onSymbolQuery?: (query: string) => Promise<Command[]>;
}

const Overlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: ${props => (props.$isOpen ? 'flex' : 'none')};
  align-items: flex-start;
  justify-content: center;
  padding-top: 10vh;
  z-index: 9999;
`;

const Container = styled.div`
  background: ${vibeTheme.colors.secondary};
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: ${vibeTheme.borderRadius.large};
  box-shadow: ${vibeTheme.shadows.large};
  width: 90%;
  max-width: 600px;
  max-height: 70vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const SearchContainer = styled.div`
  display: flex;
  align-items: center;
  padding: ${vibeTheme.spacing.md};
  border-bottom: 1px solid rgba(139, 92, 246, 0.2);
  gap: ${vibeTheme.spacing.md};
`;

const SearchIcon = styled(Search)`
  width: 20px;
  height: 20px;
  color: ${vibeTheme.colors.textMuted};
  flex-shrink: 0;
`;

const SearchInput = styled.input`
  flex: 1;
  background: transparent;
  border: none;
  color: ${vibeTheme.colors.text};
  font-size: ${vibeTheme.typography.fontSize.lg};
  font-weight: ${vibeTheme.typography.fontWeight.medium};

  &::placeholder {
    color: ${vibeTheme.colors.textMuted};
  }

  &:focus {
    outline: none;
  }
`;

const CommandList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: ${vibeTheme.spacing.sm};
`;

const CommandCategory = styled.div`
  padding: ${vibeTheme.spacing.sm} ${vibeTheme.spacing.md};
  font-size: ${vibeTheme.typography.fontSize.xs};
  font-weight: ${vibeTheme.typography.fontWeight.medium};
  color: ${vibeTheme.colors.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const CommandItem = styled.div<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: ${vibeTheme.spacing.md};
  padding: ${vibeTheme.spacing.md};
  margin: ${vibeTheme.spacing.xs} 0;
  border-radius: ${vibeTheme.borderRadius.medium};
  cursor: pointer;
  transition: all ${vibeTheme.animation.duration.fast} ease;
  background: ${props => (props.$isActive ? 'rgba(139, 92, 246, 0.2)' : 'transparent')};

  &:hover {
    background: rgba(139, 92, 246, 0.1);
  }
`;

const CommandIcon = styled.div`
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${vibeTheme.borderRadius.small};
  background: rgba(139, 92, 246, 0.1);

  svg {
    width: 18px;
    height: 18px;
    color: ${vibeTheme.colors.purple};
  }
`;

const CommandContent = styled.div`
  flex: 1;
`;

const CommandTitle = styled.div`
  font-size: ${vibeTheme.typography.fontSize.base};
  font-weight: ${vibeTheme.typography.fontWeight.medium};
  color: ${vibeTheme.colors.text};
`;

const CommandDescription = styled.div`
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.textSecondary};
  margin-top: 2px;
`;

const CommandShortcut = styled.div`
  display: flex;
  gap: ${vibeTheme.spacing.xs};
`;

const Key = styled.kbd`
  padding: 2px 6px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: ${vibeTheme.borderRadius.small};
  font-size: ${vibeTheme.typography.fontSize.xs};
  font-family: ${vibeTheme.typography.fontFamily.mono};
  color: ${vibeTheme.colors.textSecondary};
`;

export const CommandPalette = ({
  isOpen,
  onClose,
  commands,
  onSymbolQuery,
}: CommandPaletteProps) => {
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Ctrl+T symbol quick-open (spec 07 AC #6): the hook owns its own open
  // state for that path, so no host wiring is required to reach symbol mode.
  const { open, symbolMode, symbolResults, selfOpen, closeSelf } = useWorkspaceSymbolMode({
    isOpen,
    search,
    enterSymbolMode: () => {
      setSearch(SYMBOL_QUERY_PREFIX);
      setActiveIndex(0);
      inputRef.current?.focus();
    },
    onSymbolQuery,
  });

  const handleClose = () => {
    closeSelf();
    onClose();
  };

  // Symbol mode bypasses the client-side filter — the language server already
  // fuzzy-matched the query, and its hits need not contain the raw substring.
  const filteredCommands: Command[] = symbolMode
    ? symbolResults
    : filterPaletteCommands(commands, search);

  const groupedCommands = groupPaletteCommands(filteredCommands);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
      setSearch(selfOpen ? SYMBOL_QUERY_PREFIX : '');
      setActiveIndex(0);
    }
  }, [open, selfOpen]);

  useHotkeys(
    'up',
    e => {
      if (open) {
        e.preventDefault();
        setActiveIndex(prev => Math.max(0, prev - 1));
      }
    },
    [open]
  );

  useHotkeys(
    'down',
    e => {
      if (open) {
        e.preventDefault();
        setActiveIndex(prev => Math.min(filteredCommands.length - 1, prev + 1));
      }
    },
    [open, filteredCommands.length]
  );

  useHotkeys(
    'enter',
    e => {
      if (open && filteredCommands[activeIndex]) {
        e.preventDefault();
        filteredCommands[activeIndex].action();
        handleClose();
      }
    },
    [open, filteredCommands, activeIndex, onClose]
  );

  useHotkeys(
    'escape',
    e => {
      if (open) {
        e.preventDefault();
        handleClose();
      }
    },
    [open, onClose]
  );

  const formatShortcut = (shortcut: string) => {
    return shortcut.split('+').map((key, i) => <Key key={i}>{key}</Key>);
  };

  if (!open) {
    return null;
  }

  let commandIndex = 0;

  return (
    <Overlay $isOpen={open} onClick={handleClose}>
      <Container onClick={e => e.stopPropagation()}>
        <SearchContainer>
          <SearchIcon />
          <SearchInput
            ref={inputRef}
            type="text"
            placeholder="Type a command or search..."
            value={search}
            onChange={e => {
              setSearch(e.target.value);
              setActiveIndex(0);
            }}
            aria-label="Search commands"
          />
        </SearchContainer>

        <CommandList>
          {Object.entries(groupedCommands).map(
            ([category, categoryCommands]: [string, Command[]]) => (
              <div key={category}>
                <CommandCategory>{category}</CommandCategory>
                {categoryCommands.map(cmd => {
                  const currentIndex = commandIndex++;
                  return (
                    <CommandItem
                      key={cmd.id}
                      $isActive={currentIndex === activeIndex}
                      onClick={() => {
                        cmd.action();
                        handleClose();
                      }}
                      onMouseEnter={() => setActiveIndex(currentIndex)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          cmd.action();
                          handleClose();
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <CommandIcon>{cmd.icon ?? <Command />}</CommandIcon>
                      <CommandContent>
                        <CommandTitle>{cmd.title}</CommandTitle>
                        {cmd.description && (
                          <CommandDescription>{cmd.description}</CommandDescription>
                        )}
                      </CommandContent>
                      {cmd.shortcut && (
                        <CommandShortcut>{formatShortcut(cmd.shortcut)}</CommandShortcut>
                      )}
                    </CommandItem>
                  );
                })}
              </div>
            )
          )}
        </CommandList>
      </Container>
    </Overlay>
  );
};

export default CommandPalette;
