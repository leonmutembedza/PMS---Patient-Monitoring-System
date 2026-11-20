/**
 * Biquad 2nd-order IIR Filter
 * Supports Butterworth Bandpass, Lowpass, Highpass, and Notch
 */
export class BiquadFilter {
  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;

  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;

  static createBandpass(f0: number, bandwidth: number, fs: number): BiquadFilter {
    const filter = new BiquadFilter();
    const w0 = (2 * Math.PI * f0) / fs;
    const q = f0 / bandwidth;
    const alpha = Math.sin(w0) / (2 * q);

    const b0 = alpha;
    const b1 = 0;
    const b2 = -alpha;
    const a0 = 1 + alpha;
    const a1 = -2 * Math.cos(w0);
    const a2 = 1 - alpha;

    filter.b0 = b0 / a0;
    filter.b1 = b1 / a0;
    filter.b2 = b2 / a0;
    filter.a1 = a1 / a0;
    filter.a2 = a2 / a0;

    return filter;
  }

  static createNotch(f0: number, q: number, fs: number): BiquadFilter {
    const filter = new BiquadFilter();
    const w0 = (2 * Math.PI * f0) / fs;
    const alpha = Math.sin(w0) / (2 * q);

    const b0 = 1;
    const b1 = -2 * Math.cos(w0);
    const b2 = 1;
    const a0 = 1 + alpha;
    const a1 = -2 * Math.cos(w0);
    const a2 = 1 - alpha;

    filter.b0 = b0 / a0;
    filter.b1 = b1 / a0;
    filter.b2 = b2 / a0;
    filter.a1 = a1 / a0;
    filter.a2 = a2 / a0;

    return filter;
  }

  process(x: number): number {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return isNaN(y) ? 0 : y;
  }

  processArray(input: number[]): number[] {
    const out = new Array(input.length);
    for (let i = 0; i < input.length; i++) {
      out[i] = this.process(input[i]);
    }
    return out;
  }

  reset(): void {
    this.x1 = 0;
    this.x2 = 0;
    this.y1 = 0;
    this.y2 = 0;
  }
}

export interface PeakDetectionResult {
  indices: number[]; // Sample index of peak
  times: number[];   // Time in seconds from start of buffer
  amplitudes: number[];
  rrIntervalsMs: number[];
  instantaneousHr: number[];
  meanHr10s: number;
}

/**
 * Pan-Tompkins style QRS Detector for ECG Lead II
 * 1. 5-15 Hz Bandpass
 * 2. 5-point Derivative: y[n] = (1/8)*(2x[n] + x[n-1] - x[n-3] - 2x[n-4])
 * 3. Squaring: y[n] = x[n]^2
 * 4. Moving Window Integration (~100-120ms window)
 * 5. Adaptive Dual-Thresholding with refractory blanking
 * 6. Local fiducial refinement on raw ECG
 */
export function detectRPeaks(rawEcg: number[], fs: number): PeakDetectionResult {
  if (rawEcg.length < fs * 2) {
    return { indices: [], times: [], amplitudes: [], rrIntervalsMs: [], instantaneousHr: [], meanHr10s: 0 };
  }

  // 1. Bandpass filter 5-15 Hz (Center 10 Hz, BW 10 Hz)
  const bp = BiquadFilter.createBandpass(10, 10, fs);
  const filtered = bp.processArray(rawEcg);

  // 2. 5-point derivative
  const diff = new Array(filtered.length).fill(0);
  for (let i = 4; i < filtered.length; i++) {
    diff[i] = (2 * filtered[i] + filtered[i - 1] - filtered[i - 3] - 2 * filtered[i - 4]) / 8;
  }

  // 3. Squaring
  const squared = new Array(diff.length);
  for (let i = 0; i < diff.length; i++) {
    squared[i] = diff[i] * diff[i];
  }

  // 4. Moving-window integration (100 ms)
  const windowWidth = Math.max(1, Math.round(0.10 * fs));
  const integrated = new Array(squared.length).fill(0);
  let sum = 0;
  for (let i = 0; i < squared.length; i++) {
    sum += squared[i];
    if (i >= windowWidth) {
      sum -= squared[i - windowWidth];
    }
    integrated[i] = sum / windowWidth;
  }

  // 5. Adaptive Thresholding
  const maxInt = Math.max(...integrated);
  let spki = 0.35 * maxInt;
  let npki = 0.05 * spki;
  let thresholdI1 = npki + 0.25 * (spki - npki);

  const refractoryPeriod = Math.round(0.20 * fs); // 200 ms (~300 bpm limit)
  const integratedPeakIndices: number[] = [];

  let lastPeak = -refractoryPeriod;
  for (let i = 1; i < integrated.length - 1; i++) {
    if (integrated[i] > integrated[i - 1] && integrated[i] > integrated[i + 1]) {
      if (integrated[i] > thresholdI1 && (i - lastPeak) > refractoryPeriod) {
        integratedPeakIndices.push(i);
        lastPeak = i;
        spki = 0.125 * integrated[i] + 0.875 * spki;
      } else {
        npki = 0.125 * integrated[i] + 0.875 * npki;
      }
      thresholdI1 = npki + 0.25 * (spki - npki);
    }
  }

  // 6. Refine R-peaks on raw signal within [-80ms, +60ms] of integrated peak
  const searchBack = Math.round(0.08 * fs);
  const searchFwd = Math.round(0.06 * fs);
  const rawRPeakIndices: number[] = [];
  const rawAmplitudes: number[] = [];
  const rawTimes: number[] = [];

  for (const peakIdx of integratedPeakIndices) {
    const start = Math.max(0, peakIdx - searchBack);
    const end = Math.min(rawEcg.length - 1, peakIdx + searchFwd);

    let maxVal = -Infinity;
    let maxIdx = peakIdx;
    for (let j = start; j <= end; j++) {
      if (rawEcg[j] > maxVal) {
        maxVal = rawEcg[j];
        maxIdx = j;
      }
    }

    if (rawRPeakIndices.length === 0 || (maxIdx - rawRPeakIndices[rawRPeakIndices.length - 1]) > Math.round(0.20 * fs)) {
      rawRPeakIndices.push(maxIdx);
      rawAmplitudes.push(maxVal);
      rawTimes.push(maxIdx / fs);
    }
  }

  // 7. Compute RR intervals & HR
  const rrIntervalsMs: number[] = [];
  const instantaneousHr: number[] = [];

  for (let i = 1; i < rawRPeakIndices.length; i++) {
    const rrMs = ((rawRPeakIndices[i] - rawRPeakIndices[i - 1]) / fs) * 1000;
    if (rrMs >= 200 && rrMs <= 2000) { // Valid adult physiological bounds: 30 to 300 bpm
      rrIntervalsMs.push(rrMs);
      instantaneousHr.push(60000 / rrMs);
    }
  }

  const meanHr10s = rrIntervalsMs.length > 0
    ? Math.round(60000 / (rrIntervalsMs.reduce((a, b) => a + b, 0) / rrIntervalsMs.length))
    : 0;

  return {
    indices: rawRPeakIndices,
    times: rawTimes,
    amplitudes: rawAmplitudes,
    rrIntervalsMs,
    instantaneousHr,
    meanHr10s,
  };
}

/**
 * PPG Systolic Peak and Foot (Onset) Detector
 * 1. 0.5 - 8 Hz Bandpass
 * 2. Slope-sum / first-derivative thresholding
 * 3. Systolic peak detection and foot (nadir) detection for Pulse Transit Time
 */
export function detectPpgPeaks(rawPpg: number[], fs: number): {
  systolicIndices: number[];
  systolicTimes: number[];
  footIndices: number[];
  footTimes: number[];
  pulseIntervalsMs: number[];
  meanPpgHr: number;
} {
  if (rawPpg.length < fs * 2) {
    return { systolicIndices: [], systolicTimes: [], footIndices: [], footTimes: [], pulseIntervalsMs: [], meanPpgHr: 0 };
  }

  // Bandpass 0.5-8 Hz
  const bp = BiquadFilter.createBandpass(4.25, 7.5, fs);
  const filtered = bp.processArray(rawPpg);

  const systolicIndices: number[] = [];
  const footIndices: number[] = [];
  const refractory = Math.round(0.35 * fs); // 350 ms min pulse interval (prevents dicrotic notch double count)

  let lastPeak = -refractory;
  const ppgMin = Math.min(...filtered);
  const ppgMax = Math.max(...filtered);
  const dynamicRange = ppgMax - ppgMin;
  const minProminence = dynamicRange * 0.40;

  for (let i = 1; i < filtered.length - 1; i++) {
    if (filtered[i] > filtered[i - 1] && filtered[i] > filtered[i + 1]) {
      if ((filtered[i] - ppgMin) > minProminence && (i - lastPeak) > refractory) {
        systolicIndices.push(i);

        // Find onset foot (minimum between previous peak and this peak)
        const footSearchStart = Math.max(0, lastPeak > 0 ? lastPeak : i - Math.round(0.4 * fs));
        let footMin = Infinity;
        let footIdx = i;
        for (let j = footSearchStart; j < i; j++) {
          if (filtered[j] < footMin) {
            footMin = filtered[j];
            footIdx = j;
          }
        }
        footIndices.push(footIdx);
        lastPeak = i;
      }
    }
  }

  const pulseIntervalsMs: number[] = [];
  for (let i = 1; i < systolicIndices.length; i++) {
    const interval = ((systolicIndices[i] - systolicIndices[i - 1]) / fs) * 1000;
    if (interval >= 240 && interval <= 2000) {
      pulseIntervalsMs.push(interval);
    }
  }

  const meanPpgHr = pulseIntervalsMs.length > 0
    ? Math.round(60000 / (pulseIntervalsMs.reduce((a, b) => a + b, 0) / pulseIntervalsMs.length))
    : 0;

  return {
    systolicIndices,
    systolicTimes: systolicIndices.map(idx => idx / fs),
    footIndices,
    footTimes: footIndices.map(idx => idx / fs),
    pulseIntervalsMs,
    meanPpgHr,
  };
}

/**
 * Computes Pulse Transit Time (PTT) from time-aligned ECG R-peaks to PPG Onset Feet
 * PTT = t_foot(PPG) - t_R(ECG) where t_foot is the first foot following t_R
 */
export function computePulseTransitTime(ecgPeaksSec: number[], ppgFootSec: number[]): {
  meanPttMs: number | null;
  valuesMs: number[];
} {
  const pttValues: number[] = [];

  for (const tR of ecgPeaksSec) {
    // Find the first PPG foot occurring between 80 ms and 400 ms after R peak
    const foot = ppgFootSec.find(tF => (tF - tR) >= 0.08 && (tF - tR) <= 0.40);
    if (foot !== undefined) {
      pttValues.push((foot - tR) * 1000);
    }
  }

  if (pttValues.length < 2) {
    return { meanPttMs: null, valuesMs: [] };
  }

  const mean = pttValues.reduce((a, b) => a + b, 0) / pttValues.length;
  return { meanPttMs: Math.round(mean), valuesMs: pttValues };
}
