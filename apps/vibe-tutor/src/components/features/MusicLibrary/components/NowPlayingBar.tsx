/**
 * NowPlayingBar — Inline banner for active radio station
 * Shows current station with LIVE badge and stop button
 */

import { Radio, Square } from 'lucide-react';
import type { RadioStatus } from '../../../../services/audioStreamService';

interface NowPlayingBarProps {
  radioStatus: RadioStatus;
  onStopRadio: () => Promise<void>;
}

export function NowPlayingBar({ radioStatus, onStopRadio }: NowPlayingBarProps) {
  if (!radioStatus.station || !radioStatus.isPlaying) return null;

  return (
    <div className="sticky top-0 z-40 bg-gray-900/95 backdrop-blur-xl border border-blue-500/30 rounded-2xl mb-4 shadow-lg">
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Pulsing radio icon */}
        <div className="relative w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shrink-0">
          <Radio className="w-5 h-5 text-white" />
          <span className="absolute inset-0 rounded-xl bg-blue-500/50 animate-ping" />
        </div>

        {/* Station info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold bg-red-500 text-white px-1.5 py-0.5 rounded">
              LIVE
            </span>
            <span className="text-white font-medium text-sm truncate">
              {radioStatus.station.name}
            </span>
          </div>
          <div className="text-gray-400 text-xs truncate">{radioStatus.station.genre}</div>
        </div>

        {/* Stop button */}
        <button
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-500/90 hover:bg-red-500 active:bg-red-600 active:scale-95 transition-all shrink-0"
          onClick={() => void onStopRadio()}
          aria-label="Stop radio"
        >
          <Square className="w-4 h-4 text-white fill-white" />
          <span className="text-white font-semibold text-sm">Stop</span>
        </button>
      </div>
    </div>
  );
}
