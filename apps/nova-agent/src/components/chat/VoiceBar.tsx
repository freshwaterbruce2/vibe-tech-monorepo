import { Mic, MicOff, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { VoiceState } from '@/hooks/useVoice';

interface VoiceBarProps {
  state: VoiceState;
  enabled: boolean;
  onToggleEnabled: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  unsupported?: boolean;
}

export function VoiceBar({
  state,
  enabled,
  onToggleEnabled,
  onStartListening,
  onStopListening,
  unsupported = false,
}: VoiceBarProps) {
  const handleMicClick = () => {
    if (!enabled) {
      onToggleEnabled();
      return;
    }
    if (state === 'listening') {
      onStopListening();
    } else if (state === 'idle') {
      onStartListening();
    }
  };

  const icon = () => {
    if (!enabled) return <MicOff className="w-4 h-4" />;
    if (state === 'speaking') return <Volume2 className="w-4 h-4" />;
    return <Mic className="w-4 h-4" />;
  };

  const colorClass = () => {
    if (!enabled) return 'text-white/40 hover:text-white/70 hover:bg-white/10';
    if (state === 'listening') return 'text-red-400 bg-red-500/20 hover:bg-red-500/30';
    if (state === 'speaking') return 'text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20';
    if (state === 'processing') return 'text-yellow-400 bg-yellow-500/10';
    return 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/20';
  };

  const label = () => {
    if (unsupported) return 'Voice not supported in this browser';
    if (!enabled) return 'Enable voice mode';
    if (state === 'listening') return 'Listening… click to stop';
    if (state === 'speaking') return 'Speaking…';
    if (state === 'processing') return 'Processing…';
    return 'Click to speak';
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleMicClick}
          disabled={unsupported || state === 'processing' || state === 'speaking'}
          className={`relative transition-all ${colorClass()}`}
          aria-label={label()}
        >
          {icon()}
          {state === 'listening' && (
            <span className="absolute inset-0 rounded-md animate-ping bg-red-500/20 pointer-events-none" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{label()}</TooltipContent>
    </Tooltip>
  );
}
