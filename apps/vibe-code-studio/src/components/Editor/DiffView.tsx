import React from 'react';
import type { DiffResult } from '../../services/ai/InlineEditService';

interface DiffViewProps {
  diffs: DiffResult[];
}

export const DiffView: React.FC<DiffViewProps> = ({ diffs }) => {
  if (!diffs || diffs.length === 0) {
    return null;
  }

  return (
    <div className="max-h-[300px] overflow-y-auto bg-[#1e1e1e] border border-white/10 rounded-md p-3 font-mono text-xs shadow-inner">
      <div className="flex flex-col">
        {diffs.map((diff, index) => {
          let bgColor = 'transparent';
          let textColor = '#e2e8f0';
          let prefix = ' ';
          
          if (diff.type === 'add') {
            bgColor = 'rgba(34, 197, 94, 0.15)'; // Green
            textColor = '#4ade80';
            prefix = '+';
          } else if (diff.type === 'remove') {
            bgColor = 'rgba(239, 68, 68, 0.15)'; // Red
            textColor = '#f87171';
            prefix = '-';
          }

          // Split by newline to render lines individually for better formatting
          const lines = diff.content.split('\n');
          // If the last line is empty and it's not the only line, we don't need to render an extra empty div
          if (lines.length > 1 && lines[lines.length - 1] === '') {
            lines.pop();
          }

          return (
            <div key={index} style={{ backgroundColor: bgColor, color: textColor }} className="px-1 -mx-3">
              {lines.map((line, i) => (
                <div key={i} className="flex whitespace-pre-wrap word-break-all">
                  <span className="select-none opacity-50 w-4 inline-block flex-shrink-0 text-center mr-2">{prefix}</span>
                  <span className={diff.type === 'remove' ? 'line-through opacity-80' : ''}>{line || ' '}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
