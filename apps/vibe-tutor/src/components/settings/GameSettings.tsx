/**
 * Game Settings Component
 *
 * Modular settings panel for game configuration.
 * Difficulty, hints, timer mode, etc.
 */

import { Clock, Eye, Settings, Volume2, VolumeX } from 'lucide-react';
import { useState } from 'react';

import { appStore } from '../../utils/electronStore';

export type GameDifficulty = 'easy' | 'medium' | 'hard';
export type TimerMode = 'timed' | 'relaxed';

export interface GameConfig {
  difficulty: GameDifficulty;
  timerMode: TimerMode;
  hintsEnabled: boolean;
  soundEnabled: boolean;
  highContrast?: boolean;
  gridSize?: number;
  wordCount?: number;
  timeLimit?: number;
}

interface GameSettingsProps {
  config: GameConfig;
  onChange: (config: GameConfig) => void;
  gameType: string;
}

const DIFFICULTY_INFO = {
  easy: {
    label: 'Easy',
    description: 'Smaller grid, fewer words',
    color: 'from-green-500 to-emerald-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/50',
    gridSize: 8,
    wordCount: 5,
    timeLimit: 300, // 5 minutes
  },
  medium: {
    label: 'Medium',
    description: 'Standard challenge',
    color: 'from-yellow-500 to-orange-500',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/50',
    gridSize: 12,
    wordCount: 8,
    timeLimit: 480, // 8 minutes
  },
  hard: {
    label: 'Hard',
    description: 'Larger grid, more words',
    color: 'from-red-500 to-pink-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/50',
    gridSize: 15,
    wordCount: 12,
    timeLimit: 600, // 10 minutes
  },
};

const GameSettings = ({ config, onChange, gameType: _gameType }: GameSettingsProps) => {
  const [showSettings, setShowSettings] = useState(false);

  const updateDifficulty = (difficulty: GameDifficulty) => {
    const difficultyInfo = DIFFICULTY_INFO[difficulty];
    onChange({
      ...config,
      difficulty,
      gridSize: difficultyInfo.gridSize,
      wordCount: difficultyInfo.wordCount,
      timeLimit: difficultyInfo.timeLimit,
    });
  };

  const toggleTimerMode = () => {
    onChange({
      ...config,
      timerMode: config.timerMode === 'timed' ? 'relaxed' : 'timed',
    });
  };

  const toggleHints = () => {
    onChange({
      ...config,
      hintsEnabled: !config.hintsEnabled,
    });
  };

  const toggleSound = () => {
    onChange({
      ...config,
      soundEnabled: !config.soundEnabled,
    });
  };

  const toggleHighContrast = () => {
    onChange({
      ...config,
      highContrast: !config.highContrast,
    });
  };

  return (
    <div className="relative">
      {/* Settings Toggle Button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
      >
        <Settings size={20} className={showSettings ? 'animate-spin' : ''} />
        Settings
      </button>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-full right-0 mt-2 w-80 glass-card p-6 rounded-xl border border-purple-500/50 shadow-2xl z-50">
          <h3 className="text-xl font-bold mb-4 text-white">Game Settings</h3>

          {/* Difficulty */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-300 mb-3">Difficulty</label>
            <div className="space-y-2">
              {(Object.keys(DIFFICULTY_INFO) as GameDifficulty[]).map((diff) => {
                const info = DIFFICULTY_INFO[diff];
                const isSelected = config.difficulty === diff;

                return (
                  <button
                    key={diff}
                    onClick={() => updateDifficulty(diff)}
                    className={`w-full p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? `${info.borderColor} ${info.bgColor}`
                        : 'border-white/10 bg-white/5 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-left">
                        <div
                          className={`font-bold ${isSelected ? `text-transparent bg-clip-text bg-gradient-to-r ${info.color}` : 'text-white'}`}
                        >
                          {info.label}
                        </div>
                        <div className="text-xs text-gray-400">{info.description}</div>
                        <div className="text-xs text-gray-500 mt-1">
                          {info.gridSize}×{info.gridSize} grid • {info.wordCount} words
                        </div>
                      </div>
                      {isSelected && <span className="text-2xl">✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Timer Mode */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-300 mb-3">Timer Mode</label>
            <button
              onClick={toggleTimerMode}
              className={`w-full p-3 rounded-lg border-2 transition-all ${
                config.timerMode === 'timed'
                  ? 'border-cyan-500/50 bg-cyan-500/10'
                  : 'border-purple-500/50 bg-purple-500/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock
                    size={20}
                    className={config.timerMode === 'timed' ? 'text-cyan-400' : 'text-purple-400'}
                  />
                  <span className="text-white font-bold">
                    {config.timerMode === 'timed' ? 'Timed Challenge' : 'Relaxed Mode'}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {config.timerMode === 'timed'
                    ? `${Math.floor((config.timeLimit ?? 480) / 60)} min limit`
                    : 'No time limit'}
                </span>
              </div>
            </button>
          </div>

          {/* Hints */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-300 mb-3">Hints</label>
            <button
              onClick={toggleHints}
              className={`w-full p-3 rounded-lg border-2 transition-all ${
                config.hintsEnabled
                  ? 'border-yellow-500/50 bg-yellow-500/10'
                  : 'border-gray-500/50 bg-gray-500/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye
                    size={20}
                    className={config.hintsEnabled ? 'text-yellow-400' : 'text-gray-400'}
                  />
                  <span className="text-white font-bold">
                    {config.hintsEnabled ? 'Hints Available' : 'No Hints'}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {config.hintsEnabled ? '10 points each' : 'Challenge mode'}
                </span>
              </div>
            </button>
          </div>

          {/* Sound */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-300 mb-3">Sound Effects</label>
            <button
              onClick={toggleSound}
              className={`w-full p-3 rounded-lg border-2 transition-all ${
                config.soundEnabled
                  ? 'border-pink-500/50 bg-pink-500/10'
                  : 'border-gray-500/50 bg-gray-500/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {config.soundEnabled ? (
                    <Volume2 size={20} className="text-pink-400" />
                  ) : (
                    <VolumeX size={20} className="text-gray-400" />
                  )}
                  <span className="text-white font-bold">
                    {config.soundEnabled ? 'Sounds On' : 'Sounds Off'}
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* High Contrast */}
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-3">
              Visual Accessibility
            </label>
            <button
              onClick={toggleHighContrast}
              className={`w-full p-3 rounded-lg border-2 transition-all ${
                config.highContrast
                  ? 'border-orange-500/50 bg-orange-500/10'
                  : 'border-gray-500/50 bg-gray-500/10'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye
                    size={20}
                    className={config.highContrast ? 'text-orange-400' : 'text-gray-400'}
                  />
                  <span className="text-white font-bold">
                    {config.highContrast ? 'High Contrast' : 'Normal Contrast'}
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {config.highContrast ? 'Better visibility' : 'Standard colors'}
                </span>
              </div>
            </button>
          </div>

          {/* Close Button */}
          <button
            onClick={() => setShowSettings(false)}
            className="w-full mt-6 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg font-bold text-white transition-all"
          >
            Start Game
          </button>
        </div>
      )}
    </div>
  );
};

export default GameSettings;

// Default configuration
// eslint-disable-next-line react-refresh/only-export-components
export const DEFAULT_GAME_CONFIG: GameConfig = {
  difficulty: 'medium',
  timerMode: 'relaxed',
  hintsEnabled: true,
  soundEnabled: true,
  gridSize: 12,
  wordCount: 8,
  timeLimit: 480,
};

// Get saved config from localStorage
// eslint-disable-next-line react-refresh/only-export-components
export function getSavedGameConfig(gameType: string): GameConfig {
  try {
    const saved = appStore.get<Partial<GameConfig>>(`game-config-${gameType}`);
    if (saved) {
      return { ...DEFAULT_GAME_CONFIG, ...saved };
    }
  } catch {
    // Invalid data, use defaults
  }
  return DEFAULT_GAME_CONFIG;
}

// Save config to localStorage
// eslint-disable-next-line react-refresh/only-export-components
export function saveGameConfig(gameType: string, config: GameConfig): void {
  try {
    appStore.set(`game-config-${gameType}`, JSON.stringify(config));
  } catch (error) {
    console.warn('Failed to save game config:', error);
  }
}
