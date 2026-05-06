import { createContext, type ReactNode, useContext, useEffect } from 'react';

export type GameSoundType = 'pop' | 'success' | 'error' | 'victory' | 'levelUp';

export interface SharedGameCompletionResult {
  gameId: string;
  score: number;
  stars?: number;
  timeSpent?: number;
  subject?: string;
  tokensEarned?: number;
}

export interface GamesHostBridge {
  loadConfig?: <T = unknown>(key: string) => T | undefined;
  onComplete?: (result: SharedGameCompletionResult) => void;
  onEarnTokens?: (amount: number, reason?: string) => void;
  playSound?: (type: GameSoundType) => void;
  saveConfig?: (key: string, value: unknown) => void;
}

const defaultBridge: GamesHostBridge = {};
let configuredBridge: GamesHostBridge = defaultBridge;
const GamesHostBridgeContext = createContext<GamesHostBridge>(defaultBridge);

export function configureGamesHostBridge(bridge: GamesHostBridge): void {
  configuredBridge = bridge;
}

export function getConfiguredGamesHostBridge(): GamesHostBridge {
  return configuredBridge;
}

export function GamesHostBridgeProvider({
  bridge,
  children,
}: {
  bridge: GamesHostBridge;
  children: ReactNode;
}) {
  configureGamesHostBridge(bridge);

  useEffect(() => {
    configureGamesHostBridge(bridge);
    return () => configureGamesHostBridge(defaultBridge);
  }, [bridge]);

  return (
    <GamesHostBridgeContext.Provider value={bridge}>{children}</GamesHostBridgeContext.Provider>
  );
}

export function useGamesHostBridge(): GamesHostBridge {
  return useContext(GamesHostBridgeContext);
}
