import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  AlertOctagon,
  AlertTriangle,
  Sun,
  Moon,
  Maximize2,
  Minimize2,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { WardSimulationState } from '../types';

interface StatusBarProps {
  simulationState: WardSimulationState | null;
  onTogglePlay: () => void;
  onSetSpeed: (speed: number) => void;
  onScrub: (minute: number) => void;
  onReset: () => void;
  isOverviewMode: boolean;
  onToggleOverviewMode: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  suppressedAlertsCount: number;
  departmentName?: string;
  departmentStats?: {
    total: number;
    critical: number;
    warning: number;
    unreliable: number;
    hasData: boolean;
  };
}

export const StatusBar: React.FC<StatusBarProps> = ({
  simulationState,
  onTogglePlay,
  onSetSpeed,
  onScrub,
  onReset,
  isOverviewMode,
  onToggleOverviewMode,
  theme,
  onToggleTheme,
  suppressedAlertsCount,
  departmentName = 'Intensive Care Unit (ICU)',
  departmentStats,
}) => {
  const [showNoiseInfo, setShowNoiseInfo] = useState(false);

  const currentMin = simulationState?.current_time_offset_min ?? 0;
  const isPlaying = simulationState?.is_playing ?? false;
  const speed = simulationState?.speed_multiplier ?? 1;

  const hours = Math.floor(currentMin / 60);
  const minutes = currentMin % 60;
  const simTimeFormatted = `T+${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

  const critAlerts = departmentStats?.critical ?? (simulationState?.total_critical_alerts ?? 0);
  const warnAlerts = departmentStats?.warning ?? (simulationState?.total_warning_alerts ?? 0);
  const totalPatients = departmentStats?.total ?? (simulationState?.patients.length ?? 0);
  const unreliableCount = departmentStats?.unreliable ?? 0;

  return (
    <header className="h-11 bg-surface-1 border-b border-surface-border px-3.5 flex items-center justify-between text-xs select-none sticky top-0 z-40 transition-colors">
      {/* Left: Department Branding & Real-Time Overview Banner */}
      <div className="flex items-center space-x-3 shrink-0">
        <div className="flex items-center space-x-2">
          <span className="font-bold tracking-tight text-text-primary uppercase font-mono text-[12px] flex items-center gap-1.5">
            <span className="text-alarm-low font-bold">PMS:</span>
            <span>{departmentName}</span>
          </span>
          {/* Department Overview Metric Bar (Requirement 8) */}
          <div className="hidden lg:flex items-center space-x-1 font-mono text-[10px] bg-surface-2 px-2 py-0.5 rounded-[2px] border border-surface-border-subtle">
            <span className="text-text-primary font-semibold">{totalPatients} Patients</span>
            <span className="text-text-muted">•</span>
            <span className={critAlerts > 0 ? 'text-alarm-high font-bold' : 'text-text-muted'}>
              {critAlerts} High Risk
            </span>
            <span className="text-text-muted">•</span>
            <span className={warnAlerts > 0 ? 'text-alarm-medium font-bold' : 'text-text-muted'}>
              {warnAlerts} Watch
            </span>
            {unreliableCount > 0 && (
              <>
                <span className="text-text-muted">•</span>
                <span className="text-alarm-high font-semibold">{unreliableCount} Telemetry Issue</span>
              </>
            )}
          </div>
        </div>

        {/* Mandatory Clinical Safety Notice */}
        <div className="hidden xl:flex items-center px-1.5 py-0.5 rounded-[2px] bg-surface-2 border border-surface-border text-text-muted font-mono font-medium text-[9px] tracking-tight">
          MIMIC-IV REPLAY • SIMULATED
        </div>
      </div>

      {/* Center: Clinical Alarm Status (IEC 60601-1-8 priority scheme) */}
      <div className="flex items-center space-x-2 shrink-0">
        {/* High Priority (Red) */}
        <div
          className={`flex items-center space-x-1 px-2 py-0.5 rounded-[2px] font-mono font-bold text-[11px] border ${
            critAlerts > 0
              ? 'bg-alarm-high-surface border-alarm-high text-alarm-high alert-pulse-once'
              : 'border-surface-border-subtle text-text-muted'
          }`}
          title="High Priority: Immediate action required (NEWS2 >= 7 or steep decompensation)"
        >
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>{critAlerts} HIGH</span>
        </div>

        {/* Medium Priority (Amber) */}
        <div
          className={`flex items-center space-x-1 px-2 py-0.5 rounded-[2px] font-mono font-medium text-[11px] border ${
            warnAlerts > 0
              ? 'bg-alarm-medium-surface border-alarm-medium text-alarm-medium'
              : 'border-surface-border-subtle text-text-muted'
          }`}
          title="Medium Priority: Prompt review required (NEWS2 5-6)"
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>{warnAlerts} MED</span>
        </div>

        {/* Noise Suppression & Snooze Filter Badge */}
        <div className="relative">
          <button
            onClick={() => setShowNoiseInfo(!showNoiseInfo)}
            className="flex items-center space-x-1 px-2 py-0.5 rounded-[2px] bg-surface-2 hover:bg-surface-3 border border-surface-border text-text-secondary hover:text-text-primary text-[10px] transition"
            title="Click to view alarm fatigue reduction and noise suppression stats"
          >
            <Sliders className="w-3 h-3 text-alarm-low" />
            <span>{suppressedAlertsCount} Filtered/Snoozed</span>
          </button>

          {/* Noise Suppression Explainer Popover */}
          {showNoiseInfo && (
            <div className="absolute top-8 left-0 w-72 p-3 bg-surface-2 border border-surface-border rounded-[3px] shadow-2xl text-[11px] text-text-secondary z-50">
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-surface-border">
                <span className="font-semibold text-text-primary flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-alarm-low" />
                  Noise Suppression Engine
                </span>
                <button
                  onClick={() => setShowNoiseInfo(false)}
                  className="text-text-muted hover:text-text-primary"
                >
                  ✕
                </button>
              </div>
              <p className="text-[10px] text-text-secondary mb-2 leading-relaxed">
                Alarm fatigue is prevented via smart hysteresis, clinical snooze suppression, and delta filtering:
              </p>
              <ul className="space-y-1 text-[10px] font-mono list-disc list-inside text-text-muted">
                <li>Non-sustained single-point score spikes are buffered.</li>
                <li>Redundant notifications for existing deteriorating trajectories are merged.</li>
                <li>Snoozed alerts (15m/30m/60m) are silenced unless a critical step-change occurs.</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Right: Simulation Controls & Display Toggles */}
      <div className="flex items-center space-x-2.5 shrink-0">
        {/* Simulation Clock */}
        <div className="flex items-center space-x-1 text-right font-mono font-bold text-[12px] text-text-primary px-1.5 py-0.5 rounded-[2px] bg-surface-2 border border-surface-border-subtle">
          <span className="text-text-muted font-normal text-[10px]">TIME:</span>
          <span>{simTimeFormatted}</span>
        </div>

        {/* Time Slider */}
        <div className="hidden lg:flex items-center space-x-1">
          <input
            type="range"
            min="0"
            max="1440"
            value={currentMin}
            onChange={(e) => onScrub(parseInt(e.target.value, 10))}
            className="w-24 xl:w-36 h-1 bg-surface-3 rounded-[2px]"
            title="Scrub Simulation Time (0h to 24h)"
          />
        </div>

        {/* Play/Pause */}
        <button
          onClick={onTogglePlay}
          className="p-1 rounded-[2px] bg-surface-2 hover:bg-surface-3 text-text-primary border border-surface-border transition"
          title={isPlaying ? "Pause Simulation (Space)" : "Play Simulation (Space)"}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-alarm-low" />}
        </button>

        {/* Speed toggle */}
        <button
          onClick={() => onSetSpeed(speed === 1 ? 2 : speed === 2 ? 5 : speed === 5 ? 10 : 1)}
          className="px-1.5 py-0.5 rounded-[2px] bg-surface-2 hover:bg-surface-3 text-text-primary border border-surface-border font-mono font-bold text-[10px] transition"
          title="Simulation Playback Multiplier"
        >
          {speed}x
        </button>

        {/* Reset */}
        <button
          onClick={onReset}
          className="p-1 rounded-[2px] hover:bg-surface-2 text-text-muted hover:text-text-primary transition"
          title="Reset Simulation to T+00:00"
        >
          <RotateCcw className="w-3 h-3" />
        </button>

        <div className="h-4 w-px bg-surface-border mx-0.5" />

        {/* Ward Overview Wall Mode Toggle */}
        <button
          onClick={onToggleOverviewMode}
          className={`p-1 rounded-[2px] border transition ${
            isOverviewMode
              ? 'bg-alarm-low-surface border-alarm-low text-alarm-low'
              : 'bg-surface-2 border-surface-border text-text-secondary hover:text-text-primary'
          }`}
          title={isOverviewMode ? "Exit Wall Display Overview" : "Enter Wall Display Overview (1-2m Ward View)"}
        >
          {isOverviewMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        </button>

        {/* Light/Dark Room Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-1 rounded-[2px] bg-surface-2 hover:bg-surface-3 text-text-secondary hover:text-text-primary border border-surface-border transition"
          title={theme === 'dark' ? "Switch to High-Contrast Clinical Light Mode" : "Switch to Clinical Low-Glare Dark Mode"}
        >
          {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
};
