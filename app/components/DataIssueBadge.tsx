import React from 'react';
import { AlertCircle } from 'lucide-react';
import * as Tooltip from '@radix-ui/react-tooltip';

interface DataIssueBadgeProps {
  issues: string[];
}

export const DataIssueBadge: React.FC<DataIssueBadgeProps> = ({ issues }) => {
  if (!issues || issues.length === 0) return null;

  return (
    <Tooltip.Provider delayDuration={200}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-500 cursor-help">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{issues.length} Hata</span>
          </div>
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            className="z-[200] max-w-[280px] bg-black/90 backdrop-blur-xl border border-red-500/30 p-3 rounded-xl shadow-2xl text-[11px] text-red-200 animate-in fade-in zoom-in duration-200"
            sideOffset={5}
          >
            <p className="font-bold mb-1.5 text-red-400 uppercase tracking-widest text-[10px]">Tespit Edilen Sorunlar:</p>
            <ul className="space-y-1">
              {issues.map((issue, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="text-red-500">•</span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
            <Tooltip.Arrow className="fill-black/90" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
};
