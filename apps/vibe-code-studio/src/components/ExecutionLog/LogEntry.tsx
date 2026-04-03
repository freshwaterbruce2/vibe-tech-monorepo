import { AlertCircle, CheckCircle2, Info } from 'lucide-react';


export interface LogEntryData {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  source?: string;
}

interface LogEntryProps {
  entry: LogEntryData;
}

export const LogEntry = ({ entry }: LogEntryProps) => {
  const getIcon = () => {
    switch (entry.level) {
      case 'error': return <AlertCircle size={14} className="text-red-400" />;
      case 'warning': return <AlertCircle size={14} className="text-yellow-400" />;
      case 'success': return <CheckCircle2 size={14} className="text-green-400" />;
      default: return <Info size={14} className="text-blue-400" />;
    }
  };

  return (
    <div className="flex gap-3 py-2 px-3 border-b border-white/5 hover:bg-white/5 text-sm font-mono group">
      <div className="flex-none pt-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
        {getIcon()}
      </div>
      <div className="flex-1 min-w-0 break-words text-gray-300">
        <span className="opacity-50 text-xs mr-2 select-none">
          {entry.timestamp.toLocaleTimeString()}
        </span>
        {entry.source && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-white/10 text-white/60 mr-2">
            {entry.source}
          </span>
        )}
        {entry.message}
      </div>
    </div>
  );
};
