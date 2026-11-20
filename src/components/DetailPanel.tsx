import React, { useState, useEffect } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  AlertOctagon,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Pill,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { PatientCohortRecord, PatientSummary } from '../types';
import { SignalsTab } from './SignalsTab';

interface DetailPanelProps {
  patient: PatientSummary | null;
  cohortRecord: PatientCohortRecord | null;
  onClose: () => void;
  onAcknowledgeAlert: (alertId: string) => void;
  onSnoozeAlert: (alertId: string, minutes: number) => void;
  auditTrail: Record<string, { role: string; time: string }>;
  simulationMinute?: number;
  isPlaying?: boolean;
  departmentName?: string;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({
  patient,
  cohortRecord,
  onClose,
  onAcknowledgeAlert,
  onSnoozeAlert,
  auditTrail,
  simulationMinute = 0,
  isPlaying = false,
  departmentName = 'Intensive Care Unit (ICU)',
}) => {
  const [activeTab, setActiveTab] = useState<'TELEMETRY' | 'BREAKDOWN' | 'LABS_MEDS' | 'SIGNALS'>('TELEMETRY');
  const [showSuppressedExplanation, setShowSuppressedExplanation] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Reset expanded mode when selected patient changes
  useEffect(() => {
    setIsExpanded(false);
  }, [patient?.id]);

  // Handle Escape key: if expanded, restore down first; otherwise parent handles or Esc closes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isExpanded) {
          e.stopPropagation();
          setIsExpanded(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  if (!patient) return null;

  const snap = patient.current_snapshot;
  const vitals = snap.vitals;
  const labs = snap.labs;
  const news2 = snap.news2;

  // Build shared time-axis chart data from cohort record
  const trajectoryData = cohortRecord?.baseline_trajectory.map((s) => ({
    timeLabel: `T+${Math.floor(s.time_offset_min / 60)}h${s.time_offset_min % 60 ? s.time_offset_min % 60 + 'm' : ''}`,
    rawMin: s.time_offset_min,
    news2: s.news2.total,
    hr: s.vitals.heart_rate,
    sbp: s.vitals.systolic_bp,
    spo2: s.vitals.spo2,
    rr: s.vitals.resp_rate,
    lactate: s.labs.lactate,
  })) || [];

  const currentTimeLabel = `T+${Math.floor(snap.time_offset_min / 60)}h${snap.time_offset_min % 60 ? snap.time_offset_min % 60 + 'm' : ''}`;

  return (
    <aside
      className={`border-surface-border bg-surface-1 flex flex-col overflow-hidden select-text transition-all duration-300 ease-in-out ${
        isExpanded
          ? 'fixed inset-0 w-screen h-[100dvh] z-[1000] border-l-0 shadow-2xl'
          : 'w-[450px] xl:w-[500px] border-l h-full shrink-0 z-30'
      }`}
    >
      {/* 1. Header: Patient Bed, Identity, Maximize/Minimize & Close Buttons */}
      <div className="px-4 py-3 bg-surface-2 border-b border-surface-border flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-mono font-bold text-sm bg-surface-3 px-1.5 py-0.5 rounded-[2px] border border-surface-border text-text-primary">
              {patient.bed}
            </span>
            <h2 className="font-bold text-sm text-text-primary tracking-tight">
              {patient.name}
            </h2>
            <span className="text-text-muted font-mono text-[11px]">
              ({patient.age}y {patient.gender})
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-[2px] bg-surface-3 text-text-muted border border-surface-border">
              {departmentName}
            </span>
            {isExpanded && (
              <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-[2px] bg-surface-3 text-text-secondary border border-surface-border ml-2">
                Full-Screen Mode
              </span>
            )}
          </div>
          <p className="text-[11px] text-text-muted mt-1 leading-snug">
            {patient.admission_diagnosis}
          </p>
        </div>

        <div className="flex items-center space-x-1 shrink-0">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-[2px] text-text-muted hover:text-text-primary hover:bg-surface-3 border border-transparent hover:border-surface-border transition"
            title={isExpanded ? 'Restore to side panel' : 'Expand to full screen'}
            aria-label={isExpanded ? 'Restore to side panel' : 'Expand to full screen'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              setIsExpanded(false);
              onClose();
            }}
            className="p-1 rounded-[2px] text-text-muted hover:text-text-primary hover:bg-surface-3 border border-transparent hover:border-surface-border transition"
            title="Close detail panel (Esc)"
            aria-label="Close detail panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Acuity & Alarm Banner */}
      <div className="px-4 py-2.5 bg-surface-1 border-b border-surface-border flex items-center justify-between">
        <div className={`flex items-baseline space-x-2 font-mono ${isExpanded ? 'max-w-6xl mx-auto w-full' : ''}`}>
          <span className="label text-[10px]">NEWS2:</span>
          <span className={`text-2xl font-bold vital-value ${
            news2.total >= 7 ? 'text-alarm-high' : news2.total >= 5 ? 'text-alarm-medium' : 'text-alarm-low'
          }`}>
            {news2.total}
          </span>
          <span className="text-[11px] text-text-muted">/20</span>
          <span className="text-[10px] text-text-secondary ml-1">
            [{news2.risk_tier} RISK]
          </span>
          <div className="flex-1" />
          <div className="flex items-center space-x-2">
            {snap.confidence === 'UNRELIABLE' ? (
              <span className="px-1.5 py-0.5 rounded-[2px] bg-alarm-high-surface border border-alarm-high/40 text-alarm-high font-mono font-bold text-[10px] flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> SIGNAL UNRELIABLE
              </span>
            ) : (
              <span className="text-text-muted font-mono text-[10px] flex items-center gap-1">
                <Clock className="w-3 h-3" /> Updated {snap.staleness_minutes}m ago
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Alerts Section with Noise Suppression & Audit Trail */}
      {patient.active_alerts.length > 0 && (
        <div className={`p-3 bg-surface-0 border-b border-surface-border space-y-2 ${isExpanded ? 'px-6' : ''}`}>
          <div className={`${isExpanded ? 'max-w-6xl mx-auto' : ''} space-y-2`}>
          {patient.active_alerts.map((alert) => {
            const audit = auditTrail[alert.id];
            return (
              <div
                key={alert.id}
                className={`p-2.5 rounded-[2px] border text-xs ${
                  alert.severity === 'CRITICAL'
                    ? 'bg-alarm-high-surface border-alarm-high/60 text-text-primary'
                    : 'bg-alarm-medium-surface border-alarm-medium/60 text-text-primary'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start space-x-1.5">
                    {alert.severity === 'CRITICAL' ? (
                      <AlertOctagon className="w-4 h-4 text-alarm-high shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-alarm-medium shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold text-[11px] leading-tight font-mono">
                        {alert.title}
                      </div>
                      <div className="text-[10px] text-text-secondary mt-0.5">
                        {alert.explanation}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1 shrink-0 font-mono">
                    {!alert.acknowledged ? (
                      <button
                        onClick={() => onAcknowledgeAlert(alert.id)}
                        className="px-2 py-0.5 bg-surface-3 hover:bg-surface-4 text-text-primary rounded-[2px] border border-surface-border text-[10px] font-bold transition"
                      >
                        Acknowledge
                      </button>
                    ) : (
                      <span className="text-[10px] text-alarm-low font-bold">
                        ✓ Ack'd
                      </span>
                    )}

                    <select
                      onChange={(e) => {
                        const mins = parseInt(e.target.value, 10);
                        if (mins > 0) onSnoozeAlert(alert.id, mins);
                      }}
                      defaultValue=""
                      className="px-1.5 py-0.5 bg-surface-2 text-text-secondary rounded-[2px] border border-surface-border text-[10px] outline-none"
                    >
                      <option value="" disabled>Snooze...</option>
                      <option value="15">Snooze 15m</option>
                      <option value="30">Snooze 30m</option>
                      <option value="60">Snooze 60m</option>
                    </select>
                  </div>
                </div>

                {/* Audit Trail Line */}
                {alert.acknowledged && (
                  <div className="mt-1.5 pt-1.5 border-t border-surface-border-subtle text-[9px] font-mono text-text-muted flex items-center justify-between">
                    <span>Audit: Acknowledged by {audit?.role || 'Staff RN'} at {audit?.time || 'T+Current'}</span>
                    <span className="text-text-muted">Hysteresis active</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Noise Suppression & Suppressed Alerts explanation */}
          <div className="pt-1">
            <button
              onClick={() => setShowSuppressedExplanation(!showSuppressedExplanation)}
              className="w-full flex items-center justify-between text-[10px] text-text-muted hover:text-text-secondary font-mono"
            >
              <span>Filtered Alarms: 2 secondary delta warnings suppressed</span>
              {showSuppressedExplanation ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showSuppressedExplanation && (
              <div className="mt-1.5 p-2 bg-surface-2 border border-surface-border-subtle rounded-[2px] text-[10px] text-text-muted leading-relaxed font-mono">
                Single-point transient fluctuations and redundant notifications during active vasopressor titration are suppressed to reduce clinical alarm fatigue.
              </div>
            )}
          </div>
          </div>
        </div>
      )}

      {/* 4. Tab Navigation */}
      <div className="border-b border-surface-border bg-surface-2">
        <div className={`flex px-3 text-[11px] font-mono font-medium ${isExpanded ? 'max-w-6xl mx-auto' : ''}`}>
          <button
            onClick={() => setActiveTab('TELEMETRY')}
            className={`py-2 px-3 border-b-2 transition ${
              activeTab === 'TELEMETRY'
                ? 'border-alarm-low text-text-primary font-bold'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            Timeline & Telemetry
          </button>
          <button
            onClick={() => setActiveTab('BREAKDOWN')}
            className={`py-2 px-3 border-b-2 transition ${
              activeTab === 'BREAKDOWN'
                ? 'border-alarm-low text-text-primary font-bold'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            NEWS2 Breakdown
          </button>
          <button
            onClick={() => setActiveTab('LABS_MEDS')}
            className={`py-2 px-3 border-b-2 transition ${
              activeTab === 'LABS_MEDS'
                ? 'border-alarm-low text-text-primary font-bold'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            Labs & Meds
          </button>
          <button
            onClick={() => setActiveTab('SIGNALS')}
            className={`py-2 px-3 border-b-2 transition ${
              activeTab === 'SIGNALS'
                ? 'border-alarm-low text-text-primary font-bold'
                : 'border-transparent text-text-muted hover:text-text-secondary'
            }`}
          >
            Signals
          </button>
        </div>
      </div>

      {/* 5. Tab Content Area */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs ${isExpanded ? 'px-6 py-5' : ''}`}>
        {activeTab === 'TELEMETRY' && (
          <div className={`space-y-4 ${isExpanded ? 'max-w-6xl mx-auto' : ''}`}>
            {/* Plain Language Decompensation Attributions */}
            <div className="p-3 bg-surface-2 border border-surface-border rounded-[2px]">
              <div className="label text-[10px] mb-1.5 flex items-center justify-between">
                <span>Clinical Drivers (Explainability)</span>
                <span className="font-mono text-text-muted">SOFA est: {snap.sofa_est}</span>
              </div>
              {snap.contributing_factors.length === 0 ? (
                <div className="text-[11px] text-text-muted italic">All parameters within acceptable physiologic margins.</div>
              ) : (
                <ul className={`gap-x-4 gap-y-1.5 ${isExpanded ? 'grid grid-cols-2' : 'space-y-1.5'}`}>
                  {snap.contributing_factors.map((f, i) => (
                    <li key={i} className="flex items-start justify-between text-[11px] p-1 rounded-[2px] bg-surface-1/40 border border-surface-border-subtle/50">
                      <div className="flex items-start space-x-1.5">
                        <span className={`px-1 py-0.2 font-mono font-bold text-[9px] rounded-[2px] ${
                          f.impact === 'HIGH' ? 'bg-alarm-high-surface text-alarm-high border border-alarm-high/40' :
                          'bg-alarm-medium-surface text-alarm-medium border border-alarm-medium/40'
                        }`}>
                          {f.impact}
                        </span>
                        <span className="text-text-secondary">{f.description}</span>
                      </div>
                      <span className="font-mono text-text-muted text-[10px] shrink-0 ml-2">
                        +{f.points}pts
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Time-Series Charts on Shared Time Axis */}
            <div className="p-3.5 bg-surface-2 border border-surface-border rounded-[2px]">
              <div className="flex items-center justify-between mb-3">
                <span className="label text-[10px]">Acuity & Vital Trajectories (0–24h Replay)</span>
                <span className="text-[10px] font-mono text-alarm-low font-bold">Now: {currentTimeLabel}</span>
              </div>

              {/* Chart Grid: Side-by-side in full-screen, stacked in normal side panel */}
              <div className={`grid gap-4 ${isExpanded ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {/* Chart 1: NEWS2 & Lactate */}
                <div className={`w-full ${isExpanded ? 'h-64' : 'h-36'}`}>
                  <div className="text-[9px] font-mono text-text-muted mb-1.5 flex items-center justify-between">
                    <span>NEWS2 SCORE (Red) & LACTATE (Amber, mmol/L)</span>
                    <span>Threshold &ge; 7</span>
                  </div>
                  <ResponsiveContainer width="100%" height="90%">
                    <LineChart data={trajectoryData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="#26282c" />
                      <XAxis dataKey="timeLabel" stroke="#6b7076" tick={{ fontSize: 9, fill: '#6b7076' }} />
                      <YAxis stroke="#6b7076" tick={{ fontSize: 9, fill: '#6b7076' }} domain={[0, 16]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18191c', borderColor: '#35373d', fontSize: '10px', borderRadius: '2px' }}
                      />
                      <ReferenceArea y1={7} y2={16} fill="rgba(220, 38, 38, 0.05)" />
                      <ReferenceLine y={7} stroke="#dc2626" strokeDasharray="3 3" />
                      <ReferenceLine x={currentTimeLabel} stroke="#0891b2" strokeWidth={1.5} />
                      <Line type="monotone" dataKey="news2" name="NEWS2" stroke="#dc2626" strokeWidth={1.75} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="lactate" name="Lactate" stroke="#d97706" strokeWidth={1.25} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Chart 2: Hemodynamics (HR & SBP) */}
                <div className={`w-full ${isExpanded ? 'h-64' : 'h-36 pt-3 border-t border-surface-border-subtle'}`}>
                  <div className="text-[9px] font-mono text-text-muted mb-1.5 flex items-center justify-between">
                    <span>HEMODYNAMICS: HR (Cyan, bpm) & SBP (Grey, mmHg)</span>
                    <span>Hypotension SBP &lt; 90</span>
                  </div>
                  <ResponsiveContainer width="100%" height="90%">
                    <LineChart data={trajectoryData} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="2 2" stroke="#26282c" />
                      <XAxis dataKey="timeLabel" stroke="#6b7076" tick={{ fontSize: 9, fill: '#6b7076' }} />
                      <YAxis stroke="#6b7076" tick={{ fontSize: 9, fill: '#6b7076' }} domain={[40, 180]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#18191c', borderColor: '#35373d', fontSize: '10px', borderRadius: '2px' }}
                      />
                      <ReferenceArea y1={40} y2={90} fill="rgba(220, 38, 38, 0.05)" />
                      <ReferenceLine y={90} stroke="#dc2626" strokeDasharray="3 3" />
                      <ReferenceLine x={currentTimeLabel} stroke="#0891b2" strokeWidth={1.5} />
                      <Line type="monotone" dataKey="hr" name="Heart Rate" stroke="#0891b2" strokeWidth={1.5} dot={false} />
                      <Line type="monotone" dataKey="sbp" name="Systolic BP" stroke="#e4e5e7" strokeWidth={1.5} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: NEWS2 Component Breakdown Table & Physiology Summary */}
        {activeTab === 'BREAKDOWN' && (
          <div className={`space-y-4 ${isExpanded ? 'max-w-6xl mx-auto' : ''}`}>
            <div className={`grid gap-4 ${isExpanded ? 'grid-cols-3' : 'grid-cols-1'}`}>
              <div className={`${isExpanded ? 'col-span-2' : ''} space-y-3`}>
                <p className="text-[11px] text-text-secondary leading-relaxed">
                  Transparent sub-component points according to Royal College of Physicians NEWS2 standard:
                </p>
                <table className="w-full text-left font-mono text-[11px] border border-surface-border border-collapse">
                  <thead className="bg-surface-2 text-text-muted uppercase text-[9px]">
                    <tr>
                      <th className="p-2 border-b border-surface-border">Parameter</th>
                      <th className="p-2 border-b border-surface-border text-right">Value</th>
                      <th className="p-2 border-b border-surface-border text-right">Points</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border-subtle">
                    <tr>
                      <td className="p-2 text-text-secondary">Respiration Rate</td>
                      <td className="p-2 text-right text-text-primary font-medium">{vitals.resp_rate != null ? Math.round(vitals.resp_rate) : 'Unreliable'}</td>
                      <td className={`p-2 text-right font-bold ${news2.rr_score >= 3 ? 'text-alarm-high' : news2.rr_score >= 1 ? 'text-alarm-medium' : 'text-text-muted'}`}>
                        +{news2.rr_score}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 text-text-secondary">SpO2 Scale 1</td>
                      <td className="p-2 text-right text-text-primary font-medium">{vitals.spo2 != null ? `${Math.round(vitals.spo2)}%` : 'Unreliable'}</td>
                      <td className={`p-2 text-right font-bold ${news2.spo2_score >= 3 ? 'text-alarm-high' : news2.spo2_score >= 1 ? 'text-alarm-medium' : 'text-text-muted'}`}>
                        +{news2.spo2_score}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 text-text-secondary">Supplemental O2</td>
                      <td className="p-2 text-right text-text-primary font-medium">{vitals.on_supplemental_o2 ? 'Yes' : 'No (Room Air)'}</td>
                      <td className="p-2 text-right font-bold text-text-muted">
                        +{news2.o2_score}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 text-text-secondary">Systolic BP</td>
                      <td className="p-2 text-right text-text-primary font-medium">{vitals.systolic_bp != null ? `${Math.round(vitals.systolic_bp)} mmHg` : 'Unreliable'}</td>
                      <td className={`p-2 text-right font-bold ${news2.sbp_score >= 3 ? 'text-alarm-high' : news2.sbp_score >= 1 ? 'text-alarm-medium' : 'text-text-muted'}`}>
                        +{news2.sbp_score}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 text-text-secondary">Heart Rate</td>
                      <td className="p-2 text-right text-text-primary font-medium">{vitals.heart_rate != null ? `${Math.round(vitals.heart_rate)} bpm` : 'Unreliable'}</td>
                      <td className={`p-2 text-right font-bold ${news2.hr_score >= 3 ? 'text-alarm-high' : news2.hr_score >= 1 ? 'text-alarm-medium' : 'text-text-muted'}`}>
                        +{news2.hr_score}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 text-text-secondary">Consciousness</td>
                      <td className="p-2 text-right text-text-primary font-medium">{vitals.consciousness}</td>
                      <td className={`p-2 text-right font-bold ${news2.consciousness_score >= 3 ? 'text-alarm-high' : 'text-text-muted'}`}>
                        +{news2.consciousness_score}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 text-text-secondary">Temperature</td>
                      <td className="p-2 text-right text-text-primary font-medium">{vitals.temp_c != null ? `${vitals.temp_c.toFixed(1)}°C` : '—'}</td>
                      <td className={`p-2 text-right font-bold ${news2.temp_score >= 2 ? 'text-alarm-medium' : 'text-text-muted'}`}>
                        +{news2.temp_score}
                      </td>
                    </tr>
                    <tr className="bg-surface-2 font-bold">
                      <td className="p-2 text-text-primary">TOTAL NEWS2 SCORE</td>
                      <td className="p-2 text-right text-text-muted">—</td>
                      <td className={`p-2 text-right ${news2.total >= 7 ? 'text-alarm-high' : news2.total >= 5 ? 'text-alarm-medium' : 'text-alarm-low'}`}>
                        {news2.total} / 20
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Acuity Context & Clinical Response Protocols in full-screen column */}
              <div className="space-y-3">
                <div className="p-3 bg-surface-2 border border-surface-border rounded-[2px] space-y-2">
                  <div className="label text-[10px]">Clinical Response Protocol</div>
                  <div className="font-mono text-[11px] space-y-1.5">
                    <div className="flex items-center justify-between pb-1 border-b border-surface-border-subtle">
                      <span className="text-text-muted">Acuity Tier:</span>
                      <span className={`font-bold ${news2.total >= 7 ? 'text-alarm-high' : news2.total >= 5 ? 'text-alarm-medium' : 'text-alarm-low'}`}>
                        {news2.risk_tier} RISK
                      </span>
                    </div>
                    <div className="flex items-center justify-between pb-1 border-b border-surface-border-subtle">
                      <span className="text-text-muted">Recommended Monitoring:</span>
                      <span className="text-text-primary">
                        {news2.total >= 7 ? 'Continuous Bedside' : news2.total >= 5 ? 'Every 1 Hour' : 'Every 4–6 Hours'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pb-1 border-b border-surface-border-subtle">
                      <span className="text-text-muted">Medical Team Action:</span>
                      <span className="text-text-primary">
                        {news2.total >= 7 ? 'Emergency ICU Team (MET)' : news2.total >= 5 ? 'Urgent Ward Review' : 'Routine Care'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-surface-2 border border-surface-border rounded-[2px] text-[10px] text-text-muted font-mono leading-relaxed">
                  <span className="text-text-secondary font-bold block mb-1">Standard Calibration</span>
                  Score 0: Normal range. Score 1–2: Mild deviation. Score 3: Extreme physiological disturbance in single parameter. Total score &ge; 7 triggers high-priority alert.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Labs & Medications Timeline */}
        {activeTab === 'LABS_MEDS' && (
          <div className={`space-y-4 ${isExpanded ? 'max-w-6xl mx-auto' : ''}`}>
            <div className={`grid gap-4 ${isExpanded ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {/* Labs Table */}
              <div className="p-3 bg-surface-2 border border-surface-border rounded-[2px]">
                <div className="label text-[10px] mb-2">Laboratory Blood Flowsheet</div>
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="p-2 bg-surface-1 rounded-[2px] border border-surface-border-subtle">
                    <span className="text-[9px] text-text-muted block">SERUM LACTATE (Ref: 0.5–2.0)</span>
                    <span className={`text-sm font-bold block mt-0.5 ${labs.lactate && labs.lactate >= 4.0 ? 'text-alarm-high' : labs.lactate && labs.lactate >= 2.2 ? 'text-alarm-medium' : 'text-text-primary'}`}>
                      {labs.lactate ? `${labs.lactate.toFixed(1)} mmol/L` : '—'}
                    </span>
                    <span className="text-[9px] text-text-muted block mt-0.5">Tissue perfusion indicator</span>
                  </div>
                  <div className="p-2 bg-surface-1 rounded-[2px] border border-surface-border-subtle">
                    <span className="text-[9px] text-text-muted block">CREATININE (Ref: 0.6–1.2)</span>
                    <span className={`text-sm font-bold block mt-0.5 ${labs.creatinine && labs.creatinine >= 2.0 ? 'text-alarm-high' : 'text-text-primary'}`}>
                      {labs.creatinine ? `${labs.creatinine.toFixed(1)} mg/dL` : '—'}
                    </span>
                    <span className="text-[9px] text-text-muted block mt-0.5">Renal function indicator</span>
                  </div>
                  <div className="p-2 bg-surface-1 rounded-[2px] border border-surface-border-subtle">
                    <span className="text-[9px] text-text-muted block">WBC (Ref: 4.0–11.0)</span>
                    <span className="text-sm font-bold text-text-primary block mt-0.5">
                      {labs.wbc ? `${labs.wbc.toFixed(1)} K/uL` : '—'}
                    </span>
                    <span className="text-[9px] text-text-muted block mt-0.5">Inflammatory marker</span>
                  </div>
                  <div className="p-2 bg-surface-1 rounded-[2px] border border-surface-border-subtle">
                    <span className="text-[9px] text-text-muted block">PLATELETS (Ref: 150–450)</span>
                    <span className={`text-sm font-bold block mt-0.5 ${labs.platelets && labs.platelets <= 100 ? 'text-alarm-medium' : 'text-text-primary'}`}>
                      {labs.platelets ? `${Math.round(labs.platelets)} K/uL` : '—'}
                    </span>
                    <span className="text-[9px] text-text-muted block mt-0.5">Coagulation profile</span>
                  </div>
                </div>
              </div>

              {/* Medications & Infusion Timeline */}
              <div className="p-3 bg-surface-2 border border-surface-border rounded-[2px] flex flex-col justify-between">
                <div>
                  <div className="label text-[10px] mb-2 flex items-center gap-1">
                    <Pill className="w-3.5 h-3.5" />
                    Active Infusions & Drug Events
                  </div>
                  {cohortRecord?.medications && cohortRecord.medications.length > 0 ? (
                    <div className="space-y-1.5 font-mono text-[11px]">
                      {cohortRecord.medications.map((m, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-[2px] bg-surface-1 border border-surface-border-subtle flex items-center justify-between"
                        >
                          <div>
                            <span className="text-text-primary font-semibold">{m.name}</span>
                            <span className="text-[9px] text-text-muted ml-2">[{m.category}]</span>
                          </div>
                          <div className="text-right text-text-secondary text-[10px]">
                            {m.dose} • {m.route}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-text-muted italic p-2 bg-surface-1 rounded-[2px]">No continuous infusions running.</div>
                  )}
                </div>

                <div className="pt-2 mt-2 border-t border-surface-border-subtle text-[9px] font-mono text-text-muted flex items-center justify-between">
                  <span>Pharmacotherapy Audit</span>
                  <span>MAR Synced T+{snap.time_offset_min}m</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Real-Time Biosignals Streaming & Quality Assessment */}
        {activeTab === 'SIGNALS' && (
          <SignalsTab
            patient={patient}
            simulationMinute={simulationMinute}
            isPlaying={isPlaying}
            isExpanded={isExpanded}
          />
        )}
      </div>
    </aside>
  );
};
