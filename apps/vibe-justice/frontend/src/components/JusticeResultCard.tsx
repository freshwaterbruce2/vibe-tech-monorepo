import { LogicPattern } from '@/types/logic';

interface JusticeResultCardProps {
  pattern: LogicPattern;
  score: number;
}

export function JusticeResultCard({ pattern, score }: JusticeResultCardProps) {
  const isHighRelevance = score > 0.8;
  const isMediumRelevance = score > 0.5 && score <= 0.8;

  return (
    <div className={`
      relative overflow-hidden rounded-lg border p-4 transition-all duration-200
      ${isHighRelevance ? 'bg-indigo-950/30 border-indigo-500/50 hover:border-indigo-400' : ''}
      ${isMediumRelevance ? 'bg-slate-900/40 border-slate-700 hover:border-slate-600' : ''}
      ${!isHighRelevance && !isMediumRelevance ? 'bg-slate-900/20 border-slate-800 opacity-60' : ''}
    `}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mb-1">
            Rule ID: #{pattern.id}
          </span>
          <h4 className="text-sm font-medium text-slate-200 leading-tight">
            {pattern.logic_rule}
          </h4>
        </div>
        <div className={`
          flex items-center justify-center min-w-[3rem] px-2 py-1 rounded text-xs font-bold
          ${isHighRelevance ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}
        `}>
          {(score * 100).toFixed(0)}%
        </div>
      </div>

      <div className="flex flex-wrap gap-1 mt-3">
        {pattern.tags.map((tag, i) => (
          <span 
            key={i} 
            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50"
          >
            #{tag}
          </span>
        ))}
      </div>

      {isHighRelevance && (
        <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-transparent blur-xl pointer-events-none" />
      )}
    </div>
  );
}
