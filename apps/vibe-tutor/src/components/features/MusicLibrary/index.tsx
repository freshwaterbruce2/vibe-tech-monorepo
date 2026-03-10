/**
 * MusicLibrary — Simple radio station player
 * Tap a station, music plays. That's it.
 */

import { NowPlayingBar } from './components/NowPlayingBar';
import { RadioStreamsSection } from './components/RadioStreamsSection';
import { useRadioStreaming } from './hooks/useRadioStreaming';
import type { MusicLibraryProps } from './types';

export function MusicLibrary(_props: MusicLibraryProps) {
  const radio = useRadioStreaming();

  return (
    <div className="pb-24">
      {/* Now Playing Bar — shows when a station is active */}
      <NowPlayingBar radioStatus={radio.radioStatus} onStopRadio={radio.handleStopRadio} />

      {/* Radio Stations */}
      <RadioStreamsSection
        radioStatus={radio.radioStatus}
        onPlayRadio={radio.handlePlayRadio}
        onStopRadio={radio.handleStopRadio}
      />
    </div>
  );
}

export default MusicLibrary;
