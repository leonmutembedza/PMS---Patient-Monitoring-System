import React from 'react';
import { Filter, Lock, Unlock, RefreshCw, Keyboard } from 'lucide-react';

export type FilterType = 'ALL' | 'CRITICAL' | 'UNRELIABLE';

interface FilterBarProps {
  currentFilter: FilterType;
  onSelectFilter: (filter: FilterType) => void;
  counts: {
    all: number;
    critical: number;
    unreliable: number;
  };
  isSortFrozen: boolean;
  onToggleFreezeSort: () => void;
  hasPendingReorder: boolean;
  onApplyPendingReorder: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  currentFilter,
  onSelectFilter,
  counts,
  isSortFrozen,
  onToggleFreezeSort,
  hasPendingReorder,
  onApplyPendingReorder,
}) => {
  return (
    <div className="h-9 px-3.5 bg-surface-1 border-b border-surface-border flex items-center justify-between text-xs select-none">
      {/* Left: Segmented Filter Controls */}
      <div className="flex items-center space-x-1.5">
        <Filter className="w-3.5 h-3.5 text-text-muted mr-1" />
        <span className="label mr-1 text-[10px]">Filter Roster:</span>

        {/* Segmented Button Group */}
        <div className="inline-flex rounded-[2px] bg-surface-2 p-0.5 border border-surface-border-subtle font-mono text-[11px]">
          <button
            onClick={() => onSelectFilter('ALL')}
            className={`px-2 py-0.5 rounded-[2px] transition ${
              currentFilter === 'ALL'
                ? 'bg-surface-4 text-text-primary font-bold shadow-xs'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            All Beds ({counts.all})
          </button>
          <button
            onClick={() => onSelectFilter('CRITICAL')}
            className={`px-2 py-0.5 rounded-[2px] transition ${
              currentFilter === 'CRITICAL'
                ? 'bg-alarm-high-surface text-alarm-high font-bold shadow-xs border border-alarm-high/30'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Critical ({counts.critical})
          </button>
          <button
            onClick={() => onSelectFilter('UNRELIABLE')}
            className={`px-2 py-0.5 rounded-[2px] transition ${
              currentFilter === 'UNRELIABLE'
                ? 'bg-alarm-medium-surface text-alarm-medium font-bold shadow-xs border border-alarm-medium/30'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            Telemetry Issues ({counts.unreliable})
          </button>
        </div>
      </div>

      {/* Right: Layout Freeze Safety Lock & Keyboard Quick Guide */}
      <div className="flex items-center space-x-3 text-[11px]">
        {/* Safety Lock: Prevents accidental mis-selection during live updates */}
        <div className="flex items-center space-x-2">
          {hasPendingReorder && isSortFrozen && (
            <button
              onClick={onApplyPendingReorder}
              className="flex items-center space-x-1 px-2 py-0.5 bg-alarm-low-surface border border-alarm-low text-alarm-low rounded-[2px] font-mono text-[10px] animate-pulse"
              title="Acuity changes occurred. Click to update sort order."
            >
              <RefreshCw className="w-3 h-3" />
              <span>New Ranking Available</span>
            </button>
          )}

          <button
            onClick={onToggleFreezeSort}
            className={`flex items-center space-x-1 px-2 py-0.5 rounded-[2px] border font-mono text-[10px] transition ${
              isSortFrozen
                ? 'bg-alarm-medium-surface border-alarm-medium/50 text-alarm-medium'
                : 'bg-surface-2 border-surface-border text-text-muted hover:text-text-primary'
            }`}
            title="When frozen, patient order stays fixed to prevent clicking the wrong bed during emergency triage"
          >
            {isSortFrozen ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3 text-text-muted" />}
            <span>{isSortFrozen ? 'Sort Frozen' : 'Live Sorting'}</span>
          </button>
        </div>

        {/* Keyboard Quick Guide */}
        <div className="hidden md:flex items-center space-x-2 text-text-muted font-mono text-[10px]">
          <Keyboard className="w-3 h-3" />
          <span>[↑/↓] Nav</span>
          <span>[Enter] Detail</span>
          <span>[A] Ack</span>
          <span>[F] Filter</span>
        </div>
      </div>
    </div>
  );
};
