import { BiquadFilter } from './peakDetectors';

export type SignalQualityLevel = 'GOOD' | 'ACCEPTABLE' | 'UNRELIABLE';

export interface SignalQualityAssessment {
  level: SignalQualityLevel;
  failedChecks: string[];
  sqiScore: number; // 0.0 to 1.0
  metrics: {
    flatlineDetected: boolean;
    clippingDetected: boolean;
    baselineWanderRatio: number;
    powerlineInterferenceRatio: number;
    beatCorrelation: number;
    hrDisagreementBpm?: number;
  };
}

export interface RhythmRegularityAssessment {
  status: 'ASSESSABLE' | 'NOT_ASSESSABLE';
  rateCategory: 'BRADYCARDIC' | 'NORMAL' | 'TACHYCARDIC' | 'UNASSESSABLE';
  isRegular: boolean;
  rrVariabilityPercent: number;
  ectopyCountPerMin: number;
  explanation: string;
}

/**
 * Computes Signal Quality Index (SQI) across a 5-10 s window
 */
export function evaluateEcgQuality(
  rawEcg: number[],
  fs: number,
  rPeakIndices: number[],
  ecgHr: number,
  ppgHr?: number
): SignalQualityAssessment {
  const failedChecks: string[] = [];
  const N = rawEcg.length;

  if (N < fs * 2) {
    return {
      level: 'UNRELIABLE',
      failedChecks: ['Insufficient sample window'],
      sqiScore: 0,
      metrics: {
        flatlineDetected: false,
        clippingDetected: false,
        baselineWanderRatio: 0,
        powerlineInterferenceRatio: 0,
        beatCorrelation: 0,
      },
    };
  }

  // 1. Flatline / Asystole Check
  // Check sliding 1.5s window: if peak-to-peak variance is essentially zero, it's a true flatline
  const window1_5s = Math.round(1.5 * fs);
  let flatlineDetected = false;

  for (let i = 0; i <= N - window1_5s; i += Math.round(0.25 * fs)) {
    let wMin = rawEcg[i];
    let wMax = rawEcg[i];
    for (let j = i; j < i + window1_5s; j++) {
      if (rawEcg[j] < wMin) wMin = rawEcg[j];
      if (rawEcg[j] > wMax) wMax = rawEcg[j];
    }
    if ((wMax - wMin) < 0.02) {
      flatlineDetected = true;
      break;
    }
  }

  if (flatlineDetected) {
    failedChecks.push('Flatline detected (> 1.5 s)');
  }

  // Mean & Variance
  let sum = 0;
  for (let i = 0; i < N; i++) sum += rawEcg[i];
  const mean = sum / N;

  let varSum = 0;
  for (let i = 0; i < N; i++) {
    const diff = rawEcg[i] - mean;
    varSum += diff * diff;
  }
  const variance = varSum / N;
  if (variance < 0.001) {
    failedChecks.push('Near-zero signal variance (< 0.001 mV²)');
  }

  // 2. Clipping / Saturation
  const minVal = Math.min(...rawEcg);
  const maxVal = Math.max(...rawEcg);
  const peakToPeak = maxVal - minVal;

  let topClips = 0;
  let bottomClips = 0;
  for (let i = 0; i < N; i++) {
    if (rawEcg[i] >= maxVal - 0.005) topClips++;
    if (rawEcg[i] <= minVal + 0.005) bottomClips++;
  }
  const clippingDetected = topClips > (0.10 * fs) || bottomClips > (0.10 * fs);
  if (clippingDetected) {
    failedChecks.push('Amplifier saturation / clipping');
  }

  // 3. Amplitude bounds (normal adult lead II: 0.2 mV to 4.5 mV)
  if (peakToPeak < 0.15) {
    failedChecks.push('Signal amplitude below physiological range (< 0.15 mV)');
  } else if (peakToPeak > 5.0) {
    failedChecks.push('Signal amplitude exceeds physiological range (> 5.0 mV artifact)');
  }

  // 4. Baseline Wander (< 0.5 Hz)
  // Low-frequency proxy: Difference between running average (window = 1s) and global mean
  const halfSec = Math.round(0.5 * fs);
  let wanderEnergy = 0;
  for (let i = halfSec; i < N - halfSec; i += halfSec) {
    let localSum = 0;
    for (let j = i - halfSec; j < i + halfSec; j++) localSum += rawEcg[j];
    const localMean = localSum / (2 * halfSec);
    wanderEnergy += Math.abs(localMean - mean);
  }
  const baselineWanderRatio = wanderEnergy / (N / (2 * halfSec));
  if (baselineWanderRatio > 0.45 * peakToPeak) {
    failedChecks.push('Excessive baseline wander');
  }

  // 5. 50/60 Hz Powerline Interference Filter Ratio
  // Use a second-order bandpass filter centered at 50 Hz to extract line noise energy
  const f50 = BiquadFilter.createBandpass(50, 4, fs);
  const sig50 = f50.processArray(rawEcg);
  let e50 = 0;
  let eTotal = 0;
  for (let i = 0; i < N; i++) {
    e50 += sig50[i] * sig50[i];
    eTotal += (rawEcg[i] - mean) * (rawEcg[i] - mean);
  }
  const powerlineRatio = eTotal > 0 ? e50 / eTotal : 0;
  if (powerlineRatio > 0.18) {
    failedChecks.push('50 Hz powerline interference');
  }

  // 6. Beat-Template Correlation
  // Extract beats [-80ms to +120ms] around R-peaks, compute template and correlation
  let beatCorrelation = 1.0;
  const preR = Math.round(0.08 * fs);
  const postR = Math.round(0.12 * fs);
  const beatLen = preR + postR;
  const beats: number[][] = [];

  for (const rIdx of rPeakIndices) {
    if (rIdx >= preR && rIdx + postR < N) {
      beats.push(rawEcg.slice(rIdx - preR, rIdx + postR));
    }
  }

  if (beats.length >= 3) {
    // Average template
    const template = new Array(beatLen).fill(0);
    for (let k = 0; k < beatLen; k++) {
      let bSum = 0;
      for (let b = 0; b < beats.length; b++) bSum += beats[b][k];
      template[k] = bSum / beats.length;
    }

    // Average correlation coefficient
    let totalCorr = 0;
    for (const beat of beats) {
      totalCorr += pearsonCorrelation(beat, template);
    }
    beatCorrelation = totalCorr / beats.length;

    if (beatCorrelation < 0.65) {
      failedChecks.push(`Low beat template correlation (${beatCorrelation.toFixed(2)} < 0.65)`);
    }
  }

  // 7. ECG vs PPG Agreement
  let hrDisagreementBpm: number | undefined;
  if (ppgHr !== undefined && ppgHr > 0 && ecgHr > 0) {
    hrDisagreementBpm = Math.abs(ecgHr - ppgHr);
    if (hrDisagreementBpm > 10) {
      failedChecks.push(`ECG/PPG rate disagreement (${hrDisagreementBpm} bpm difference)`);
    }
  }

  // Scoring
  let score = 1.0;
  if (flatlineDetected || clippingDetected || variance < 0.002) {
    score = 0.0;
  } else {
    score -= failedChecks.length * 0.25;
    score = Math.max(0, Math.min(1, score));
  }

  let level: SignalQualityLevel = 'GOOD';
  if (score < 0.35 || flatlineDetected || clippingDetected) {
    level = 'UNRELIABLE';
  } else if (score < 0.75 || failedChecks.length > 0) {
    level = 'ACCEPTABLE';
  }

  return {
    level,
    failedChecks,
    sqiScore: score,
    metrics: {
      flatlineDetected,
      clippingDetected,
      baselineWanderRatio,
      powerlineInterferenceRatio: powerlineRatio,
      beatCorrelation,
      hrDisagreementBpm,
    },
  };
}

/**
 * Rhythm Regularity and Rate Assessment (Screening indicator, not diagnosis)
 * Evaluated ONLY when Signal Quality is GOOD
 */
export function evaluateRhythm(
  quality: SignalQualityLevel,
  ecgHr: number,
  rrIntervalsMs: number[]
): RhythmRegularityAssessment {
  if (quality !== 'GOOD' || rrIntervalsMs.length < 3 || ecgHr <= 0) {
    return {
      status: 'NOT_ASSESSABLE',
      rateCategory: 'UNASSESSABLE',
      isRegular: false,
      rrVariabilityPercent: 0,
      ectopyCountPerMin: 0,
      explanation: 'Not assessable (requires GOOD signal quality)',
    };
  }

  // Rate categorization (Standard adult thresholds)
  let rateCategory: 'BRADYCARDIC' | 'NORMAL' | 'TACHYCARDIC' = 'NORMAL';
  if (ecgHr < 60) {
    rateCategory = 'BRADYCARDIC';
  } else if (ecgHr > 100) {
    rateCategory = 'TACHYCARDIC';
  }

  // RR interval mean and standard deviation
  const meanRR = rrIntervalsMs.reduce((a, b) => a + b, 0) / rrIntervalsMs.length;
  let varSum = 0;
  for (const rr of rrIntervalsMs) {
    varSum += (rr - meanRR) * (rr - meanRR);
  }
  const stdRR = Math.sqrt(varSum / rrIntervalsMs.length);
  const cvRR = (stdRR / meanRR) * 100; // Coefficient of Variation in %

  // Outlier / ectopy-like beats (RR interval deviating > 20% from mean)
  let ectopyCount = 0;
  for (const rr of rrIntervalsMs) {
    if (Math.abs(rr - meanRR) / meanRR > 0.20) {
      ectopyCount++;
    }
  }

  // Extrapolate ectopy to per-minute based on duration
  const totalWindowSec = rrIntervalsMs.reduce((a, b) => a + b, 0) / 1000;
  const ectopyPerMin = totalWindowSec > 0 ? Math.round((ectopyCount / totalWindowSec) * 60) : 0;

  // Regularity flag: CV > 12% indicates irregular rhythm
  const isRegular = cvRR <= 12.0 && ectopyCount <= 1;

  let explanation = isRegular ? 'Regular rhythm' : 'Irregular rhythm';
  if (ectopyPerMin > 0) {
    explanation += ` with ${ectopyPerMin} ectopy-like outliers/min`;
  }

  return {
    status: 'ASSESSABLE',
    rateCategory,
    isRegular,
    rrVariabilityPercent: Math.round(cvRR * 10) / 10,
    ectopyCountPerMin: ectopyPerMin,
    explanation,
  };
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0 || y.length !== n) return 0;

  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += x[i];
    sumY += y[i];
  }
  const meanX = sumX / n;
  const meanY = sumY / n;

  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}
