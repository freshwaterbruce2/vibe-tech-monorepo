import { Star } from 'lucide-react';

interface GameCompletionStat {
  label: string;
  value: string | number;
}

interface GameCompletionModalProps {
  open: boolean;
  title: string;
  subtitle: string;
  stars: number;
  stats: GameCompletionStat[];
  primaryLabel: string;
  primaryAction: () => void;
  secondaryLabel?: string;
  secondaryAction?: () => void;
  emoji?: string;
}

const GameCompletionModal = ({
  open,
  title,
  subtitle,
  stars,
  stats,
  primaryLabel,
  primaryAction,
  secondaryLabel,
  secondaryAction,
  emoji = '🎉',
}: GameCompletionModalProps) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-[fadeIn_0.3s_ease]">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-900 to-blue-900 p-8 text-center shadow-2xl animate-[scaleIn_0.3s_ease]">
        <div className="mb-3 text-5xl">{emoji}</div>
        <h3 className="mb-2 text-2xl font-bold text-white">{title}</h3>
        <p className="mb-5 text-sm text-white/70">{subtitle}</p>

        <div className="mb-4 flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <Star
              key={value}
              size={28}
              className={`transition-all duration-500 ${
                value <= stars
                  ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.5)]'
                  : 'text-white/20'
              }`}
            />
          ))}
        </div>

        <div className="mb-5 grid grid-cols-2 gap-3 text-sm text-white/80">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl bg-white/10 px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.12em] text-cyan-200">
                {stat.label}
              </div>
              <div className="mt-1 text-xl font-bold text-white">{stat.value}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {secondaryLabel && secondaryAction && (
            <button
              onClick={secondaryAction}
              className="rounded-lg bg-white/10 px-4 py-2 text-white transition-colors hover:bg-white/20"
            >
              {secondaryLabel}
            </button>
          )}
          <button
            onClick={primaryAction}
            className="rounded-lg bg-emerald-600 px-6 py-2 font-medium text-white transition-colors hover:bg-emerald-700"
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameCompletionModal;
