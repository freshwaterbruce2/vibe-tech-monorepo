import { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const TRACKS = [
  { id: 'zen', name: 'Zen Garden', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' }, // Placeholder URLs
  { id: 'rain', name: 'Soft Rain', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 'forest', name: 'Deep Forest', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' },
];

export default function AudioLayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(TRACKS[0]);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(console.error);
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="fixed bottom-24 right-4 z-50 flex flex-col items-end gap-2">
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="p-3 mb-2 rounded-2xl glass min-w-[160px] shadow-xl"
          >
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest opacity-60">Soundscapes</p>
            <div className="flex flex-col gap-1">
              {TRACKS.map((track) => (
                <button
                  key={track.id}
                  onClick={() => {
                    setCurrentTrack(track);
                    setIsPlaying(false);
                    setShowPicker(false);
                  }}
                  className={`px-3 py-2 text-sm text-left rounded-lg transition-colors ${
                    currentTrack.id === track.id ? 'bg-sky-500 text-white' : 'hover:bg-white/5'
                  }`}
                >
                  {track.name}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 p-2 rounded-full glass shadow-lg">
        <button
          onClick={() => setShowPicker(!showPicker)}
          className="p-2 rounded-full hover:bg-white/5 transition-colors"
        >
          <Music className="w-5 h-5 opacity-70" />
        </button>

        <div className="h-4 w-[1px] bg-white/10 mx-1" />

        <button
          onClick={togglePlay}
          className="p-2 rounded-full bg-sky-500 text-white hover:scale-105 transition-transform"
        >
          {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
        </button>

        <button
          onClick={() => setIsMuted(!isMuted)}
          className="p-2 rounded-full hover:bg-white/5 transition-colors"
        >
          {isMuted ? <VolumeX className="w-5 h-5 opacity-70" /> : <Volume2 className="w-5 h-5 opacity-70" />}
        </button>
      </div>

      <audio
        ref={audioRef}
        src={currentTrack.url}
        loop
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />
    </div>
  );
}
