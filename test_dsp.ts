import { detectRPeaks, detectPpgPeaks, computePulseTransitTime } from './src/dsp/peakDetectors';
import { evaluateEcgQuality, evaluateRhythm } from './src/dsp/signalQuality';
import { generateSyntheticPhysiology } from './src/dsp/syntheticGenerator';

function runTests() {
  console.log("=== RUNNING DSP & SIGNAL QUALITY TEST SUITE ===");

  const fs = 250;
  const durationSec = 10;
  let passedCount = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string) {
    totalTests++;
    if (condition) {
      console.log(`  [PASS] ${testName}`);
      passedCount++;
    } else {
      console.error(`  [FAIL] ${testName}`);
    }
  }

  // 1. Test ECG R-Peak Detector on Standard Sinus Rhythm (75 bpm)
  const clean75 = generateSyntheticPhysiology(fs, durationSec, 75, 15, 120, 80, 98, false);
  const ecg75Result = detectRPeaks(clean75.channels.ecgLeadII, fs);

  assert(ecg75Result.indices.length >= 11 && ecg75Result.indices.length <= 13, "ECG R-peak count for 75 bpm in 10s is ~12 beats");
  assert(Math.abs(ecg75Result.meanHr10s - 75) <= 2, `ECG derived HR (${ecg75Result.meanHr10s} bpm) matches target 75 bpm within 2 bpm`);

  // 2. Test ECG R-Peak Detector on Tachycardia (140 bpm)
  const clean140 = generateSyntheticPhysiology(fs, durationSec, 140, 24, 90, 50, 91, false);
  const ecg140Result = detectRPeaks(clean140.channels.ecgLeadII, fs);

  assert(ecg140Result.indices.length >= 21 && ecg140Result.indices.length <= 24, "ECG R-peak count for 140 bpm in 10s is ~23 beats");
  assert(Math.abs(ecg140Result.meanHr10s - 140) <= 3, `ECG derived HR (${ecg140Result.meanHr10s} bpm) matches target 140 bpm within 3 bpm`);

  // 3. Test ECG R-Peak Detector on Bradycardia (45 bpm)
  const clean45 = generateSyntheticPhysiology(fs, durationSec, 45, 12, 110, 70, 97, false);
  const ecg45Result = detectRPeaks(clean45.channels.ecgLeadII, fs);

  assert(ecg45Result.indices.length >= 6 && ecg45Result.indices.length <= 8, "ECG R-peak count for 45 bpm in 10s is ~7 beats");
  assert(Math.abs(ecg45Result.meanHr10s - 45) <= 2, `ECG derived HR (${ecg45Result.meanHr10s} bpm) matches target 45 bpm within 2 bpm`);

  // 4. Test PPG Systolic Peak Detector & Pulse Rate
  const ppgResult = detectPpgPeaks(clean75.channels.ppg, fs);
  assert(ppgResult.systolicIndices.length >= 11 && ppgResult.systolicIndices.length <= 13, "PPG systolic peak count is ~12 beats");
  assert(Math.abs(ppgResult.meanPpgHr - 75) <= 2, `PPG derived HR (${ppgResult.meanPpgHr} bpm) matches 75 bpm`);

  // 5. Test Pulse Transit Time (PTT)
  const pttResult = computePulseTransitTime(ecg75Result.times, ppgResult.footTimes);
  assert(pttResult.meanPttMs !== null && pttResult.meanPttMs >= 120 && pttResult.meanPttMs <= 350, `PTT (${pttResult.meanPttMs} ms) is in physiological range (120-350 ms)`);

  // 6. Test Quality Assessment on Clean Signal
  const cleanQuality = evaluateEcgQuality(clean75.channels.ecgLeadII, fs, ecg75Result.indices, ecg75Result.meanHr10s, ppgResult.meanPpgHr);
  assert(cleanQuality.level === 'GOOD', "Clean ECG classified as GOOD quality");
  assert(cleanQuality.sqiScore >= 0.85, `Clean ECG SQI score >= 0.85 (got ${(cleanQuality.sqiScore*100).toFixed(0)}%)`);

  // 7. Synthetic Corruptions: 50 Hz Powerline Noise
  const noisy50Hz = clean75.channels.ecgLeadII.map((val, idx) => val + 0.8 * Math.sin(2 * Math.PI * 50 * (idx / fs)));
  const noisy50HzPeaks = detectRPeaks(noisy50Hz, fs);
  const quality50Hz = evaluateEcgQuality(noisy50Hz, fs, noisy50HzPeaks.indices, noisy50HzPeaks.meanHr10s);
  assert(quality50Hz.level !== 'GOOD', "50 Hz noise degrades quality away from GOOD");
  assert(quality50Hz.failedChecks.some(f => f.includes("50 Hz") || f.includes("correlation")), "50 Hz interference identified in failed checks");

  // 8. Synthetic Corruptions: Flatline / Sensor Disconnect
  const flatlineSignal = new Array(fs * durationSec).fill(0.001);
  const flatlinePeaks = detectRPeaks(flatlineSignal, fs);
  const flatlineQuality = evaluateEcgQuality(flatlineSignal, fs, flatlinePeaks.indices, 0);
  assert(flatlineQuality.level === 'UNRELIABLE', "Flatline sensor disconnect classified as UNRELIABLE");
  assert(flatlineQuality.failedChecks.some(f => f.toLowerCase().includes("flatline")), "Flatline detected in failed checks explanation");

  // 9. Synthetic Corruptions: Amplifier Clipping / Saturation
  const clippedSignal = clean75.channels.ecgLeadII.map(val => Math.min(0.5, Math.max(-0.2, val)));
  const clippedPeaks = detectRPeaks(clippedSignal, fs);
  const clippedQuality = evaluateEcgQuality(clippedSignal, fs, clippedPeaks.indices, clippedPeaks.meanHr10s);
  assert(clippedQuality.level === 'UNRELIABLE', "Clipping saturation classified as UNRELIABLE");
  assert(clippedQuality.failedChecks.some(f => f.toLowerCase().includes("clipping") || f.toLowerCase().includes("saturation")), "Clipping reported in failed checks");

  // 10. Rhythm Regularity Screening
  const regularRhythm = evaluateRhythm('GOOD', 75, ecg75Result.rrIntervalsMs);
  assert(regularRhythm.status === 'ASSESSABLE' && regularRhythm.isRegular, "Normal sinus rhythm classified as Regular");
  assert(regularRhythm.rateCategory === 'NORMAL', "75 bpm classified as NORMAL rate");

  const unassessableRhythm = evaluateRhythm('UNRELIABLE', 75, ecg75Result.rrIntervalsMs);
  assert(unassessableRhythm.status === 'NOT_ASSESSABLE', "Unreliable signal results in NOT_ASSESSABLE rhythm screening");

  console.log(`\n=== RESULTS: ${passedCount} / ${totalTests} TESTS PASSED ===\n`);
}

runTests();
