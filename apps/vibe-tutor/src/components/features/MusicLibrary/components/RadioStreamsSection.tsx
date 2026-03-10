/**
 * RadioStreamsSection — Category chips + station cards (Tailwind)
 */

import { AlertCircle, Pause, Play, Radio } from 'lucide-react';
import { useState } from 'react';
import { RADIO_CATEGORIES, RADIO_STATIONS } from '../../../../services/curatedMusicData';
import type { RadioStation, RadioStatus } from '../types';

interface RadioStreamsSectionProps {
  radioStatus: RadioStatus;
  onPlayRadio: (station: RadioStation) => Promise<void>;
  onStopRadio: () => Promise<void>;
}

export function RadioStreamsSection({
  radioStatus,
  onPlayRadio,
  onStopRadio,
}: RadioStreamsSectionProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredStations =
    activeCategory === 'all'
      ? RADIO_STATIONS
      : RADIO_STATIONS.filter((s) => s.category === activeCategory);

  return (
    <div className="space-y-4">
      {/* Category Chips — horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {RADIO_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all active:scale-95 ${
              activeCategory === cat.id
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }`}
            onClick={() => setActiveCategory(cat.id)}
            aria-label={`Filter by ${cat.name}`}
          >
            <span>{cat.icon}</span>
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Station List */}
      <div className="space-y-2">
        {filteredStations.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-gray-500">
            <Radio className="w-8 h-8 opacity-40" />
            <p>No stations in this category</p>
          </div>
        ) : (
          filteredStations.map((station) => {
            const isActive = radioStatus.station?.id === station.id && radioStatus.isPlaying;

            return (
              <button
                key={station.id}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all active:scale-[0.98] ${
                  isActive
                    ? 'bg-blue-500/15 border border-blue-500/40'
                    : 'bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/15'
                }`}
                onClick={() => {
                  if (isActive) {
                    void onStopRadio();
                  } else {
                    void onPlayRadio(station);
                  }
                }}
                aria-label={isActive ? `Stop ${station.name}` : `Play ${station.name}`}
              >
                {/* Icon / EQ Bars */}
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-blue-500 text-white' : 'bg-white/10 text-gray-400'
                  }`}
                >
                  {isActive ? (
                    <div className="flex items-end gap-[3px] h-4">
                      <span
                        className="w-[3px] bg-white rounded-full animate-bounce"
                        style={{ height: '60%', animationDelay: '0ms' }}
                      />
                      <span
                        className="w-[3px] bg-white rounded-full animate-bounce"
                        style={{ height: '100%', animationDelay: '150ms' }}
                      />
                      <span
                        className="w-[3px] bg-white rounded-full animate-bounce"
                        style={{ height: '40%', animationDelay: '300ms' }}
                      />
                    </div>
                  ) : (
                    <Radio className="w-5 h-5" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div
                    className={`font-medium text-sm truncate ${isActive ? 'text-blue-300' : 'text-white'}`}
                  >
                    {station.name}
                  </div>
                  <div className="text-xs text-gray-500 truncate">{station.genre}</div>
                </div>

                {/* Play/Pause */}
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    isActive ? 'text-blue-400' : 'text-gray-500'
                  }`}
                >
                  {isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Error Toast */}
      {radioStatus.error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{radioStatus.error}</span>
        </div>
      )}
    </div>
  );
}
