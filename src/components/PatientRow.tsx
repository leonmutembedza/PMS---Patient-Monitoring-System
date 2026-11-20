import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Check,
} from 'lucide-react';
import { PatientSummary } from '../types';
import { Sparkline } from './Sparkline';

interface PatientRowProps {
  patient: PatientSummary;
  rank: number;
  isSelected: boolean;
  onSelect: () => void;
  onAcknowledgeAlert?: (alertId: string) => void;
  vitalHistory?: {
    hr: (number | null)[];
    sbp: (number | null)[];
    spo2: (number | null)[];
    rr: (number | null)[];
    temp: (number | null)[];
  };
  isOverviewMode?: boolean;
}

export const PatientRow: React.FC<PatientRowProps> = ({
  patient,
  rank,
  isSelected,
  onSelect,
  onAcknowledgeAlert,
  vitalHistory,
  isOverviewMode = false,
}) => {
  const snap = patient.current_snapshot;
  const vitals = snap.vitals;
  const news2 = snap.news2;
  const alerts = patient.active_alerts;
  const topAlert = alerts.find((a) => a.severity === 'CRITICAL') || alerts[0];

  // Clinical alarm priority styling for left-edge risk bar
  const getRiskBarStyle = () => {
    if (news2.total >= 7) return 'risk-bar-high';
    if (news2.total >= 5) return 'risk-bar-medium';
    if (news2.total >= 1) return 'risk-bar-low';
    return 'risk-bar-normal';
  };

  const getScoreColor = () => {
    if (news2.total >= 7) return 'text-alarm-high';
    if (news2.total >= 5) return 'text-alarm-medium';
    if (news2.total >= 1) return 'text-alarm-low';
    return 'text-text-muted';
  };

  // Trend indicator: Delta over last 30 minutes
  const delta = news2.total - patient.previous_score;
  const renderTrend = () => {
    if (delta > 0) {
      return (
        <span
          className={`flex items-center font-mono font-bold text-[11px] ${
            delta >= 3 ? 'text-alarm-high' : 'text-alarm-medium'
          }`}
          title={`Score increased by +${delta} over last 30 min window`}
        >
          <TrendingUp className="w-3.5 h-3.5 mr-0.5 inline-block shrink-0" />
          <span>+{delta}</span>
        </span>
      );
    }
    if (delta < 0) {
      return (
        <span
          className="flex items-center font-mono font-medium text-[11px] text-alarm-low"
          title={`Score improved by ${delta} over last 30 min window`}
        >
          <TrendingDown className="w-3.5 h-3.5 mr-0.5 inline-block shrink-0" />
          <span>{delta}</span>
        </span>
      );
    }
    return (
      <span
        className="flex items-center font-mono text-[11px] text-text-muted"
        title="Score stable over last 30 min window"
      >
        <Minus className="w-3 h-3 mr-0.5 inline-block shrink-0" />
        <span>0</span>
      </span>
    );
  };

  // Freshness color: normal (<60m), amber (60-180m), red (>180m stale)
  const getFreshnessColor = (minutes: number) => {
    if (minutes > 180) return 'text-alarm-high';
    if (minutes > 60) return 'text-alarm-medium';
    return 'text-text-muted';
  };

  // Primary explainability driver string
  const primaryDriver = snap.contributing_factors.length > 0
    ? snap.contributing_factors[0].description
    : 'All physiological parameters within normal range';

  return (
    <tr
      onClick={onSelect}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onSelect();
      }}
      className={`group cursor-pointer border-b border-surface-border-subtle transition-colors duration-150 outline-none ${getRiskBarStyle()} ${
        isSelected
          ? 'bg-surface-3 shadow-inner ring-1 ring-inset ring-focus-ring'
          : 'hover:bg-surface-2/60 bg-surface-0'
      }`}
    >
      {/* 1. Bed ID & Rank */}
      <td className="px-3 py-2 whitespace-nowrap text-left font-mono">
        <div className="flex items-center space-x-1.5">
          <span className="text-text-muted text-[10px] w-4 text-right">#{rank}</span>
          <span className="font-bold text-text-primary text-[13px] bg-surface-2 px-1.5 py-0.5 rounded-[2px] border border-surface-border-subtle">
            {patient.bed}
          </span>
        </div>
      </td>

      {/* 2. Patient Demographics & Diagnosis */}
      <td className="px-3 py-2 text-left min-w-[170px] max-w-[210px]">
        <div className="truncate font-semibold text-text-primary text-[12px] leading-tight">
          {patient.name}
        </div>
        <div
          className="truncate text-[10px] text-text-muted mt-0.5"
          title={`${patient.admission_diagnosis} (${patient.age}y ${patient.gender})`}
        >
          <span className="font-mono text-text-secondary">{patient.age}{patient.gender}</span> • {patient.admission_diagnosis}
        </div>
      </td>

      {/* 3. NEWS2 Score */}
      <td className="px-3 py-2 whitespace-nowrap text-center">
        <div className="flex items-center justify-center space-x-1">
          <span className={`vital-value text-xl ${getScoreColor()}`}>
            {news2.total}
          </span>
          <span className="text-[9px] font-mono text-text-muted">/20</span>
        </div>
      </td>

      {/* 4. Trend (30m window) */}
      <td className="px-2 py-2 whitespace-nowrap text-center text-xs">
        <div className="flex flex-col items-center justify-center">
          {renderTrend()}
          <span className="text-[8px] font-mono text-text-muted uppercase tracking-tighter">
            Δ 30m
          </span>
        </div>
      </td>

      {/* 5. HR (Heart Rate) */}
      <td className="px-2.5 py-2 whitespace-nowrap text-right">
        {vitals.heart_rate !== null ? (
          <div className="flex items-center justify-end space-x-1.5">
            <span className={`vital-value text-[13px] ${
              vitals.heart_rate >= 131 || vitals.heart_rate <= 40 ? 'text-alarm-high font-extrabold' :
              vitals.heart_rate >= 111 ? 'text-alarm-medium' : 'text-text-primary'
            }`}>
              {Math.round(vitals.heart_rate)}
            </span>
            <span className="text-[9px] text-text-muted font-mono">bpm</span>
            {!isOverviewMode && vitalHistory && (
              <Sparkline data={vitalHistory.hr} color="#0891b2" />
            )}
          </div>
        ) : (
          <span className="px-1 py-0.5 rounded-[2px] bg-alarm-high-surface text-alarm-high text-[9px] font-mono font-bold tracking-tight">
            SIGNAL UNRELIABLE
          </span>
        )}
      </td>

      {/* 6. BP (Blood Pressure & MAP) */}
      <td className="px-2.5 py-2 whitespace-nowrap text-right">
        {vitals.systolic_bp !== null && vitals.diastolic_bp !== null ? (
          <div className="flex items-center justify-end space-x-1.5">
            <span className={`vital-value text-[13px] ${
              vitals.systolic_bp <= 90 ? 'text-alarm-high font-extrabold' :
              vitals.systolic_bp <= 100 ? 'text-alarm-medium' : 'text-text-primary'
            }`}>
              {Math.round(vitals.systolic_bp)}/{Math.round(vitals.diastolic_bp)}
            </span>
            {vitals.mean_arterial_pressure && (
              <span className="text-[10px] text-text-muted font-mono">
                ({Math.round(vitals.mean_arterial_pressure)})
              </span>
            )}
            {!isOverviewMode && vitalHistory && (
              <Sparkline data={vitalHistory.sbp} color="#0891b2" />
            )}
          </div>
        ) : (
          <span className="px-1 py-0.5 rounded-[2px] bg-alarm-high-surface text-alarm-high text-[9px] font-mono font-bold tracking-tight">
            SIGNAL UNRELIABLE
          </span>
        )}
      </td>

      {/* 7. SpO2 */}
      <td className="px-2.5 py-2 whitespace-nowrap text-right">
        {vitals.spo2 !== null ? (
          <div className="flex items-center justify-end space-x-1">
            <span className={`vital-value text-[13px] ${
              vitals.spo2 <= 91 ? 'text-alarm-high font-extrabold' :
              vitals.spo2 <= 93 ? 'text-alarm-medium' : 'text-text-primary'
            }`}>
              {Math.round(vitals.spo2)}%
            </span>
            {vitals.on_supplemental_o2 && (
              <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-alarm-low-surface text-alarm-low border border-alarm-low/30" title="Supplemental Oxygen">
                O2
              </span>
            )}
            {!isOverviewMode && vitalHistory && (
              <Sparkline data={vitalHistory.spo2} color="#0891b2" />
            )}
          </div>
        ) : (
          <span className="px-1 py-0.5 rounded-[2px] bg-alarm-high-surface text-alarm-high text-[9px] font-mono font-bold tracking-tight">
            SIGNAL UNRELIABLE
          </span>
        )}
      </td>

      {/* 8. RR (Respiration Rate) */}
      <td className="px-2.5 py-2 whitespace-nowrap text-right">
        {vitals.resp_rate !== null ? (
          <div className="flex items-center justify-end space-x-1.5">
            <span className={`vital-value text-[13px] ${
              vitals.resp_rate >= 25 || vitals.resp_rate <= 8 ? 'text-alarm-high font-extrabold' :
              vitals.resp_rate >= 21 ? 'text-alarm-medium' : 'text-text-primary'
            }`}>
              {Math.round(vitals.resp_rate)}
            </span>
            <span className="text-[9px] text-text-muted font-mono">br/m</span>
            {!isOverviewMode && vitalHistory && (
              <Sparkline data={vitalHistory.rr} color="#0891b2" />
            )}
          </div>
        ) : (
          <span className="px-1 py-0.5 rounded-[2px] bg-alarm-high-surface text-alarm-high text-[9px] font-mono font-bold tracking-tight">
            SIGNAL UNRELIABLE
          </span>
        )}
      </td>

      {/* 9. Temp */}
      <td className="px-2.5 py-2 whitespace-nowrap text-right">
        {vitals.temp_c !== null ? (
          <div className="flex items-center justify-end space-x-1.5">
            <span className={`vital-value text-[12px] ${
              vitals.temp_c <= 35.0 ? 'text-alarm-high font-extrabold' :
              vitals.temp_c >= 39.1 ? 'text-alarm-medium' : 'text-text-primary'
            }`}>
              {vitals.temp_c.toFixed(1)}°
            </span>
            {!isOverviewMode && vitalHistory && (
              <Sparkline data={vitalHistory.temp} color="#0891b2" />
            )}
          </div>
        ) : (
          <span className="text-text-muted font-mono text-[11px]">—</span>
        )}
      </td>

      {/* 10. Primary Decompensation Driver (Explainability) */}
      <td className="px-3 py-2 text-left min-w-[200px] max-w-[280px]">
        <div
          className={`text-[11px] truncate ${
            snap.contributing_factors.length > 0 && snap.contributing_factors[0].impact === 'HIGH'
              ? 'text-alarm-high font-medium'
              : snap.contributing_factors.length > 0
              ? 'text-alarm-medium'
              : 'text-text-muted italic'
          }`}
          title={primaryDriver}
        >
          {primaryDriver}
        </div>
      </td>

      {/* 11. Freshness & Confidence */}
      <td className="px-3 py-2 whitespace-nowrap text-left text-xs font-mono">
        <div className="flex items-center space-x-1.5">
          <Clock className="w-3 h-3 text-text-muted shrink-0" />
          <span className={`text-[10px] ${getFreshnessColor(snap.staleness_minutes)}`}>
            {snap.staleness_minutes}m ago
          </span>
        </div>
        <div className="flex items-center space-x-1 mt-0.5 text-[10px]">
          {snap.confidence === 'HIGH' ? (
            <span className="text-alarm-low flex items-center gap-0.5" title="Full telemetry available, low noise">
              <ShieldCheck className="w-3 h-3" /> HIGH CONF
            </span>
          ) : snap.confidence === 'MODERATE' ? (
            <span className="text-alarm-medium flex items-center gap-0.5" title="Partial staleness or single missing parameter">
              <ShieldAlert className="w-3 h-3" /> MOD CONF
            </span>
          ) : (
            <span className="text-alarm-high font-bold flex items-center gap-0.5" title="Multiple telemetry leads disconnected. Not guessing.">
              <ShieldAlert className="w-3 h-3" /> UNRELIABLE
            </span>
          )}
        </div>
      </td>

      {/* 12. Alert Action Button (if any) */}
      <td className="px-3 py-2 whitespace-nowrap text-right">
        {topAlert ? (
          <div className="inline-flex items-center space-x-1">
            {!topAlert.acknowledged ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAcknowledgeAlert?.(topAlert.id);
                }}
                className="px-2 py-0.5 rounded-[2px] bg-surface-2 hover:bg-surface-3 border border-surface-border text-text-primary text-[10px] font-mono font-medium hover:border-focus-ring transition"
                title="Acknowledge alert (Shortcut: A)"
              >
                Ack
              </button>
            ) : (
              <span className="text-[10px] font-mono text-text-muted flex items-center gap-0.5" title="Alert acknowledged">
                <Check className="w-3 h-3 text-alarm-low" /> Ack'd
              </span>
            )}
          </div>
        ) : (
          <span className="text-text-muted text-[10px] font-mono">—</span>
        )}
      </td>
    </tr>
  );
};
