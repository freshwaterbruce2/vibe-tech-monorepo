/**
 * useBrowserCommands — palette entries for the spec 11 `/browser` shortcut:
 * a verify-in-browser entry point plus state-aware approve/deny/revoke
 * controls for the current permission request or session. Pure command-def
 * logic lives in services/browser/browserCommands.ts; consumed by
 * useAICommandPalette, same pattern as useScheduleCommands.
 * Spec: FEATURE_SPECS/competitive-gaps/11-BROWSER-VERIFICATION.md
 */
import { Globe, ShieldCheck, ShieldX, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { getBrowserSessionService } from '../services/browser/BrowserSessionService';
import type { BrowserCommandKind } from '../services/browser/browserCommands';
import { buildBrowserCommandDefs } from '../services/browser/browserCommands';
import { useBrowserSessionStore } from '../stores/browserSessionStore';

export interface BrowserCommand {
  id: string;
  title: string;
  description?: string;
  icon?: ReactNode;
  shortcut?: string;
  action: () => void;
  category?: string;
  keywords?: string[];
}

export interface UseBrowserCommandsProps {
  /** Surfaces the AI chat so the user can ask the agent to run /browser */
  onToggleAIChat?: () => void;
}

export const useBrowserCommands = ({
  onToggleAIChat,
}: UseBrowserCommandsProps = {}): BrowserCommand[] => {
  const pending = useBrowserSessionStore(state => state.pendingRequest);
  const session = useBrowserSessionStore(state => state.activeSession);

  const actionFor: Record<BrowserCommandKind, () => void> = {
    'open-agent-chat': () => onToggleAIChat?.(),
    approve: () => void getBrowserSessionService().approvePendingRequest(),
    deny: () => getBrowserSessionService().denyPendingRequest(),
    revoke: () => getBrowserSessionService().revokeActiveSession(),
  };
  const iconFor: Record<BrowserCommandKind, ReactNode> = {
    'open-agent-chat': <Globe size={18} />,
    approve: <ShieldCheck size={18} />,
    deny: <ShieldX size={18} />,
    revoke: <X size={18} />,
  };

  return buildBrowserCommandDefs(pending, session).map(def => ({
    id: def.id,
    title: def.title,
    description: def.description,
    icon: iconFor[def.kind],
    action: actionFor[def.kind],
    category: def.category,
    keywords: def.keywords,
  }));
};
