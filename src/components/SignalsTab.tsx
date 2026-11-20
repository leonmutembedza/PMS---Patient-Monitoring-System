import React, { useState, useMemo } from 'react';
import {
  Activity,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { PatientSummary } from '../types';
import { BiosignalCanvas } from './BiosignalCanvas';
import { detectRPeaks, detectPpgPeaks, computePulseTransitTime } from '../dsp/peakDetectors';
import { evaluateEcgQuality, evaluateRhythm } from '../dsp/signalQuality';
import { generateSyntheticPhysiology } from '../dsp/syntheticGenerator';

interface SignalsTabProps {
  patient: PatientSummary;
  simulationMinute: number;
  isPlaying: boolean;
  isExpanded?: boolean;
  onSignalDisagreementAlert?: (alert: { id: string; title: string; explanation: string }) => void;
  onSignalUnreliableState?: (isUnreliable: boolean) => void;
}

export const SignalsTab: React.FC<SignalsTabProps> = ({
  patient,
  simulationMinute,
  isPlaying,
  isExpanded = false,
}) => {
  const [allowSynthetic, setAllowSynthetic] = useState(true);
  const [visibleWindowSec] = useState(10); // 10 s visible window

  const vitals = patient.current_snapshot.vitals;
  const isTelemetryUnreliable = patient.current_snapshot.confidence === 'UNRELIABLE';

  // 1. Generate or load waveform data for current patient and time window
  const fs = 250; // 250 Hz sampling rate
  const rawData = useMemo(() => {
    // If setting enabled, synthesize physiological waveform consistent with replayed HR/RR
    const hr = vitals.heart_rate || 75;
    const rr = vitals.resp_rate || 16;
    const sbp = vitals.systolic_bp || 120;
    const dbp = vitals.diastolic_bp || 80;
    const spo2 = vitals.spo2 || 98;

    return generateSyntheticPhysiology(
      fs,
      visibleWindowSec,
      hr,
      rr,
      sbp,
      dbp,
      spo2,
      isTelemetryUnreliable // simulate noisy artifacts/flatlines if patient has sensor drop
    );
  }, [patient.id, simulationMinute, vitals, isTelemetryUnreliable, visibleWindowSec]);

  // 2. Real-time Peak Detection & Derived Metrics
  const ecgPeaks = useMemo(() => {
    return detectRPeaks(rawData.channels.ecgLeadII, fs);
  }, [rawData]);

  const ppgPeaks = useMemo(() => {
    return detectPpgPeaks(rawData.channels.ppg, fs);
  }, [rawData]);

  // Pulse Transit Time (R-peak to PPG foot)
  const ptt = useMemo(() => {
    return computePulseTransitTime(ecgPeaks.times, ppgPeaks.footTimes);
  }, [ecgPeaks.times, ppgPeaks.footTimes]);

  // 3. Signal Quality Index (SQI)
  const ecgQuality = useMemo(() => {
    return evaluateEcgQuality(
      rawData.channels.ecgLeadII,
      fs,
      ecgPeaks.indices,
      ecgPeaks.meanHr10s,
      ppgPeaks.meanPpgHr
    );
  }, [rawData, ecgPeaks, ppgPeaks]);

  // 4. Rhythm Regularity & Rate Screening (Evaluated ONLY when quality is GOOD)
  const rhythm = useMemo(() => {
    return evaluateRhythm(ecgQuality.level, ecgPeaks.meanHr10s, ecgPeaks.rrIntervalsMs);
  }, [ecgQuality.level, ecgPeaks]);

  // Compute RMSSD (ms)
  const rmssdMs = useMemo(() => {
    const rr = ecgPeaks.rrIntervalsMs;
    if (rr.length < 2) return null;
    let sumDiffSq = 0;
    for (let i = 1; i < rr.length; i++) {
      const diff = rr[i] - rr[i - 1];
      sumDiffSq += diff * diff;
    }
    return Math.round(Math.sqrt(sumDiffSq / (rr.length - 1)));
  }, [ecgPeaks.rrIntervalsMs]);

  // Telemetry vs Derived HR Agreement
  const telemetryHr = vitals.heart_rate ? Math.round(vitals.heart_rate) : null;
  const derivedEcgHr = ecgQuality.level !== 'UNRELIABLE' && ecgPeaks.meanHr10s > 0 ? ecgPeaks.meanHr10s : null;
  const derivedPpgHr = ecgQuality.level !== 'UNRELIABLE' && ppgPeaks.meanPpgHr > 0 ? ppgPeaks.meanPpgHr : null;

  const hrDiffBpm = derivedEcgHr !== null && derivedPpgHr !== null
    ? Math.abs(derivedEcgHr - derivedPpgHr)
    : null;

  const telemetryDisagreement = telemetryHr !== null && derivedEcgHr !== null
    ? Math.abs(telemetryHr - derivedEcgHr) > 10
    : false;

  // Channel configs for high-performance Canvas rendering
  const channels = useMemo(() => {
    return [
      {
        label: 'ECG Lead II',
        units: 'mV',
        fs,
        data: rawData.channels.ecgLeadII,
        peakIndices: ecgQuality.level !== 'UNRELIABLE' ? ecgPeaks.indices : undefined,
        color: ecgQuality.level === 'UNRELIABLE' ? '#dc2626' : '#0891b2',
        minVal: -0.5,
        maxVal: 2.0,
        scaleLabel: '10 mm/mV',
      },
      {
        label: 'Plethysmogram (PPG)',
        units: 'AU',
        fs,
        data: rawData.channels.ppg,
        peakIndices: ecgQuality.level !== 'UNRELIABLE' ? ppgPeaks.systolicIndices : undefined,
        color: '#34d399',
        minVal: -0.2,
        maxVal: 1.5,
        scaleLabel: 'Norm Gain',
      },
      {
        label: 'Arterial Pressure (ABP)',
        units: 'mmHg',
        fs,
        data: rawData.channels.abp || [],
        color: '#fbbf24',
        minVal: 40,
        maxVal: 200,
        scaleLabel: 'Scale 0–200',
      },
      {
        label: 'Respiration (Transthoracic)',
        units: 'Ohm',
        fs,
        data: rawData.channels.respiration || [],
        color: '#9ca0a8',
        minVal: -1.5,
        maxVal: 1.5,
        scaleLabel: 'Autoscale',
      },
    ];
  }, [rawData, ecgPeaks, ppgPeaks, ecgQuality.level]);

  return (
    <div className={`space-y-3 font-sans text-xs select-text ${isExpanded ? 'max-w-6xl mx-auto' : ''}`}>
      {/* 1. Header Banner & Synthetic Warning Label */}
      <div className="flex items-center justify-between p-2.5 bg-surface-2 border border-surface-border rounded-[2px]">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-alarm-low" />
          <span className="font-mono font-bold text-text-primary text-[11px] tracking-tight">
            10-SECOND TIME-ALIGNED BIOSIGNAL WINDOW
          </span>
          {rawData.isSynthetic && (
            <span className="px-1.5 py-0.5 rounded-[2px] bg-alarm-medium-surface border border-alarm-medium/40 text-alarm-medium font-mono font-bold text-[9px] flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" /> SYNTHETIC REPLAY
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2 font-mono text-[10px]">
          <label className="flex items-center space-x-1 cursor-pointer text-text-muted hover:text-text-primary">
            <input
              type="checkbox"
              checked={allowSynthetic}
              onChange={(e) => setAllowSynthetic(e.target.checked)}
              className="rounded-[2px] accent-alarm-low"
            />
            <span>Synthetic Signal Mode</span>
          </label>
        </div>
      </div>

      {/* 2. Compact Signal Metrics Grid (Tabular Numerals) */}
      <div className={`grid gap-2 font-mono text-[11px] ${
        isExpanded ? 'grid-cols-4' : 'grid-cols-2 sm:grid-cols-4'
      }`}>
        {/* ECG Derived HR */}
        <div className="p-2 bg-surface-2 border border-surface-border rounded-[2px]">
          <div className="label text-[9px]">HR (ECG Lead II)</div>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="vital-value text-base text-text-primary font-bold">
              {derivedEcgHr !== null ? derivedEcgHr : '—'}
            </span>
            <span className="text-[9px] text-text-muted">bpm</span>
          </div>
          <div className="text-[9px] text-text-muted mt-0.5">
            {ecgQuality.level === 'UNRELIABLE' ? (
              <span className="text-alarm-high font-bold">UNAVAILABLE</span>
            ) : (
              <span>Valid (10s avg)</span>
            )}
          </div>
        </div>

        {/* PPG Derived HR & Disagreement */}
        <div className="p-2 bg-surface-2 border border-surface-border rounded-[2px]">
          <div className="label text-[9px]">HR (PPG Pulse)</div>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="vital-value text-base text-text-primary font-bold">
              {derivedPpgHr !== null ? derivedPpgHr : '—'}
            </span>
            <span className="text-[9px] text-text-muted">bpm</span>
          </div>
          <div className="text-[9px] mt-0.5">
            {hrDiffBpm !== null ? (
              hrDiffBpm > 10 ? (
                <span className="text-alarm-high font-bold flex items-center gap-0.5">
                  <AlertTriangle className="w-2.5 h-2.5" /> Δ {hrDiffBpm} bpm!
                </span>
              ) : (
                <span className="text-text-muted">Δ {hrDiffBpm} bpm (Agrees)</span>
              )
            ) : (
              <span className="text-text-muted">—</span>
            )}
          </div>
        </div>

        {/* Heart Rate Variability (RR Mean / RMSSD) */}
        <div className="p-2 bg-surface-2 border border-surface-border rounded-[2px]">
          <div className="label text-[9px]">HRV (RMSSD / RR)</div>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="vital-value text-base text-text-primary font-bold">
              {rmssdMs !== null ? rmssdMs : '—'}
            </span>
            <span className="text-[9px] text-text-muted">ms</span>
          </div>
          <div className="text-[9px] text-text-muted mt-0.5">
            {ecgPeaks.rrIntervalsMs.length > 0 ? (
              <span>RR {Math.round(ecgPeaks.rrIntervalsMs.reduce((a,b)=>a+b,0)/ecgPeaks.rrIntervalsMs.length)} ms</span>
            ) : (
              <span>No intervals</span>
            )}
          </div>
        </div>

        {/* Pulse Transit Time (PTT) */}
        <div className="p-2 bg-surface-2 border border-surface-border rounded-[2px]">
          <div className="label text-[9px]">Pulse Transit Time</div>
          <div className="flex items-baseline space-x-1 mt-1">
            <span className="vital-value text-base text-text-primary font-bold">
              {ptt.meanPttMs !== null ? ptt.meanPttMs : '—'}
            </span>
            <span className="text-[9px] text-text-muted">ms</span>
          </div>
          <div className="text-[9px] text-text-muted mt-0.5">
            {ptt.meanPttMs !== null ? 'ECG R to PPG Foot' : 'Low Confidence'}
          </div>
        </div>
      </div>

      {/* Telemetry Disagreement Alert Warning if > 10 bpm */}
      {telemetryDisagreement && (
        <div className="p-2 bg-alarm-medium-surface border border-alarm-medium/50 rounded-[2px] flex items-center justify-between text-[11px] text-alarm-medium font-mono">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            <span>
              Telemetry HR ({telemetryHr} bpm) disagrees with Signal-derived HR ({derivedEcgHr} bpm) by &gt; 10 bpm!
            </span>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-wider">[Advisory Alert]</span>
        </div>
      )}

      {/* 3. High-Performance Multi-Channel Waveform Canvas */}
      <div className={`w-full ${isExpanded ? 'h-[360px]' : 'h-[280px]'}`}>
        <BiosignalCanvas
          channels={channels}
          visibleWindowSec={visibleWindowSec}
          isPlaying={isPlaying}
        />
      </div>

      {/* 4. Signal Quality Index (SQI) Assessment & Rhythm Regularity in responsive columns */}
      <div className={`grid gap-3 ${isExpanded ? 'grid-cols-2' : 'grid-cols-1'}`}>
        {/* Signal Quality Index (SQI) Assessment & Checks Breakdown */}
        <div className="p-3 bg-surface-2 border border-surface-border rounded-[2px] space-y-2">
          <div className="flex items-center justify-between border-b border-surface-border-subtle pb-1.5">
            <div className="flex items-center space-x-2">
              <span className="label text-[10px]">Signal Quality Index (SQI):</span>
              <span
                className={`px-2 py-0.5 rounded-[2px] font-mono font-bold text-[10px] flex items-center gap-1 ${
                  ecgQuality.level === 'GOOD'
                    ? 'bg-alarm-low-surface border border-alarm-low/40 text-alarm-low'
                    : ecgQuality.level === 'ACCEPTABLE'
                    ? 'bg-alarm-medium-surface border border-alarm-medium/40 text-alarm-medium'
                    : 'bg-alarm-high-surface border border-alarm-high/40 text-alarm-high'
                }`}
              >
                {ecgQuality.level === 'GOOD' ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                {ecgQuality.level}
              </span>
            </div>

            <div className="font-mono text-[10px] text-text-muted">
              SQI Score: {(ecgQuality.sqiScore * 100).toFixed(0)}%
            </div>
          </div>

          {/* Plain-Language Explanations of Failed Checks */}
          {ecgQuality.failedChecks.length > 0 ? (
            <div>
              <div className="text-[10px] font-mono text-alarm-medium mb-1 flex items-center gap-1">
                <Info className="w-3 h-3" /> Identified Artifacts & Noise In 10s Window:
              </div>
              <ul className="space-y-0.5 list-disc list-inside font-mono text-[10px] text-text-secondary">
                {ecgQuality.failedChecks.map((fail, idx) => (
                  <li key={idx} className="text-alarm-high">{fail}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="text-[10px] font-mono text-alarm-low flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> All quality checks passed: Zero flatline, minimal wander, high beat correlation (&gt;0.85).
            </div>
          )}
        </div>

        {/* Rhythm Regularity & Rate Screening (Screening Indicator, Not Diagnosis) */}
        <div className="p-3 bg-surface-2 border border-surface-border rounded-[2px] font-mono text-[11px] space-y-1.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-surface-border-subtle pb-1.5 mb-1.5">
              <span className="label text-[10px]">Rhythm Regularity & Rate Screening:</span>
              <span className="text-[9px] text-text-muted italic">Screening indicator, not diagnosis</span>
            </div>

            {rhythm.status === 'ASSESSABLE' ? (
              <div className="space-y-1.5 pt-0.5">
                <div className="flex items-center justify-between text-text-primary text-[11px]">
                  <div className="flex items-center space-x-2">
                    <span className={`px-1.5 py-0.2 rounded-[2px] font-bold text-[9px] ${
                      rhythm.rateCategory === 'NORMAL' ? 'bg-alarm-low-surface text-alarm-low border border-alarm-low/30' :
                      'bg-alarm-medium-surface text-alarm-medium border border-alarm-medium/30'
                    }`}>
                      {rhythm.rateCategory} RATE
                    </span>
                    <span>{rhythm.explanation}</span>
                  </div>
                  <div className="text-text-muted text-[10px]">
                    RR Var: {rhythm.rrVariabilityPercent}%
                  </div>
                </div>
                <div className="text-[10px] text-text-secondary">
                  Short-term variability indicator RMSSD: <span className="font-bold text-text-primary">{rmssdMs !== null ? `${rmssdMs} ms` : '—'}</span>
                </div>
              </div>
            ) : (
              <div className="text-text-muted text-[10px] italic pt-1">
                Not assessable (requires GOOD signal quality index)
              </div>
            )}
          </div>

          <div className="pt-2 text-[9px] text-text-muted border-t border-surface-border-subtle flex items-center justify-between">
            <span>R-peak detector: Pan-Tompkins derivative</span>
            <span>PPG foot: 2nd derivative minima</span>
          </div>
        </div>
      </div>
    </div>
  );
};
